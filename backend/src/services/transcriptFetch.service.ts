import { MicrosoftProcessingMode, type MicrosoftIntegration } from "@prisma/client";
import { HttpError } from "../utils/http-error";
import { HistoryService } from "./history.service";
import { MicrosoftGraphService } from "./microsoftGraph.service";
import { TranscriptProcessingService } from "./transcript-processing.service";
import { prisma } from "./storage/prisma.service";

export class TranscriptFetchService {
  private readonly graphService = new MicrosoftGraphService();
  private readonly historyService = new HistoryService();
  private readonly transcriptProcessingService = new TranscriptProcessingService();

  public async handleTranscriptReadyNotification(params: {
    subscriptionId?: string;
    clientState?: string;
    resource: string;
  }) {
    const parsed = this.parseTranscriptResource(params.resource);
    if (!parsed) {
      console.log("[Microsoft Webhook] Ignoring unsupported resource.", params.resource);
      return;
    }

    const integration = await prisma.microsoftIntegration.findFirst({
      where: {
        microsoftUserId: parsed.microsoftUserId,
        automationEnabled: true,
        ...(params.subscriptionId ? { subscriptionId: params.subscriptionId } : {})
      },
      include: { user: true }
    });

    if (!integration) {
      console.log("[Microsoft Webhook] No enabled integration found for transcript notification.");
      return;
    }

    if (integration.subscriptionClientState && params.clientState && integration.subscriptionClientState !== params.clientState) {
      throw new HttpError(401, "Microsoft webhook clientState mismatch.");
    }

    const activeIntegration = await this.ensureFreshToken(integration);

    const existingRecord = await this.historyService.findByMeetingTranscript({
      userId: activeIntegration.userId,
      meetingId: parsed.meetingId,
      transcriptId: parsed.transcriptId
    });
    if (existingRecord) {
      console.log("[Microsoft Webhook] Transcript already processed.", {
        meetingId: parsed.meetingId,
        transcriptId: parsed.transcriptId
      });
      return;
    }

    const meeting = await this.graphService.getOnlineMeeting({
      accessToken: activeIntegration.accessToken,
      microsoftUserId: activeIntegration.microsoftUserId,
      meetingId: parsed.meetingId
    });

    if (!this.shouldProcessMeeting(activeIntegration, meeting)) {
      console.log("[Microsoft Webhook] Meeting skipped by automation rules.", {
        meetingId: parsed.meetingId,
        title: meeting.subject,
        mode: activeIntegration.processingMode
      });
      return;
    }

    const transcriptText = await this.graphService.getTranscriptText({
      accessToken: activeIntegration.accessToken,
      microsoftUserId: activeIntegration.microsoftUserId,
      meetingId: parsed.meetingId,
      transcriptId: parsed.transcriptId
    });

    try {
      await this.transcriptProcessingService.processMicrosoftTranscript({
        userId: activeIntegration.userId,
        userName: activeIntegration.user.name,
        userEmail: activeIntegration.email,
        transcriptText,
        transcriptLabel: "Microsoft Teams transcript",
        meetingId: parsed.meetingId,
        transcriptId: parsed.transcriptId,
        meetingTitle: meeting.subject ?? "Teams Meeting",
        meetingStartTime: meeting.startDateTime ? new Date(meeting.startDateTime) : null,
        meetingEndTime: meeting.endDateTime ? new Date(meeting.endDateTime) : null,
        processingMode: activeIntegration.processingMode
      });
    } catch (error) {
      await this.historyService.createFailedRecord({
        userId: activeIntegration.userId,
        userName: activeIntegration.user.name,
        userEmail: activeIntegration.email,
        sourceType: "microsoft_teams",
        processingMode: activeIntegration.processingMode,
        meetingId: parsed.meetingId,
        transcriptId: parsed.transcriptId,
        sourceLabel: "Microsoft Teams transcript",
        meetingTitle: meeting.subject ?? "Teams Meeting",
        meetingStartTime: meeting.startDateTime ? new Date(meeting.startDateTime) : null,
        meetingEndTime: meeting.endDateTime ? new Date(meeting.endDateTime) : null,
        transcriptText,
        errorMessage: error instanceof Error ? error.message : "Microsoft transcript processing failed."
      });
      throw error;
    }
  }

  private parseTranscriptResource(resource: string) {
    const normalized = resource.replace(/^\/+/, "");
    const withQuotedIds = normalized.match(
      /^users\/([^/]+)\/onlineMeetings\('([^']+)'\)\/transcripts\('([^']+)'\)$/i
    );
    if (withQuotedIds) {
      return {
        microsoftUserId: decodeURIComponent(withQuotedIds[1]),
        meetingId: decodeURIComponent(withQuotedIds[2]),
        transcriptId: decodeURIComponent(withQuotedIds[3])
      };
    }

    const plain = normalized.match(/^users\/([^/]+)\/onlineMeetings\/([^/]+)\/transcripts\/([^/]+)$/i);
    if (plain) {
      return {
        microsoftUserId: decodeURIComponent(plain[1]),
        meetingId: decodeURIComponent(plain[2]),
        transcriptId: decodeURIComponent(plain[3])
      };
    }

    return null;
  }

  private shouldProcessMeeting(
    integration: Pick<MicrosoftIntegration, "microsoftUserId" | "processingMode">,
    meeting: {
      subject?: string | null;
      organizer?: { identity?: { user?: { id?: string | null } } };
    }
  ) {
    const organizerId = meeting.organizer?.identity?.user?.id ?? null;
    if (organizerId && organizerId !== integration.microsoftUserId) {
      return false;
    }

    if (integration.processingMode === MicrosoftProcessingMode.organizer_only) {
      return true;
    }

    return (meeting.subject ?? "").toUpperCase().includes("[TRACK]");
  }

  private async ensureFreshToken(integration: MicrosoftIntegration & {
    user: { id: string; name: string; email: string };
  }) {
    if (integration.tokenExpiresAt > new Date(Date.now() + 60 * 1000)) {
      return integration;
    }

    if (!integration.refreshToken) {
      throw new HttpError(401, "Microsoft refresh token is missing. Reconnect Microsoft.");
    }

    const refreshed = await this.graphService.refreshAccessToken(integration.refreshToken);
    return prisma.microsoftIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? integration.refreshToken,
        tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        lastSyncError: null
      },
      include: {
        user: true
      }
    });
  }
}
