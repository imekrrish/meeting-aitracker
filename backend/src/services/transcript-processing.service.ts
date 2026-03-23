import { ProcessingSourceType, type MicrosoftProcessingMode } from "@prisma/client";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";
import type { EmailTranscriptInput, ProcessTranscriptInput } from "../validators/transcript.validator";
import { ManualUploadAdapter } from "./adapters/manual-upload.adapter";
import { MicrosoftTeamsAdapter } from "./adapters/microsoft-teams.adapter";
import type { TranscriptIngestionPayload, TranscriptSourceAdapter } from "./adapters/transcript-source-adapter";
import { EmailService } from "./email.service";
import { HistoryService } from "./history.service";
import { MeetingProcessingService } from "./meeting-processing.service";

export class TranscriptProcessingService {
  private readonly adapters: TranscriptSourceAdapter[] = [new MicrosoftTeamsAdapter(), new ManualUploadAdapter()];
  private readonly historyService = new HistoryService();
  private readonly emailService = new EmailService();
  private readonly meetingProcessingService = new MeetingProcessingService();

  public validateFile(file?: Express.Multer.File) {
    if (!file) {
      return;
    }

    const allowedMimeTypes = ["text/plain"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpError(400, "Only plain text transcript files are supported.");
    }

    const maxSizeBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new HttpError(400, `File exceeds ${env.MAX_UPLOAD_SIZE_MB}MB limit.`);
    }
  }

  public async process(input: ProcessTranscriptInput, file: Express.Multer.File | undefined, authUser: {
    userId: string;
    name: string;
    email: string;
  }) {
    return this.processFromAdapter(
      {
        transcriptText: input.transcriptText,
        file
      },
      {
        userId: authUser.userId,
        userName: authUser.name,
        userEmail: authUser.email,
        meetingTitle: input.meetingTitle || "Meeting Summary",
        projectName: input.projectName || null,
        customColumns: input.customColumns,
        sourceType: ProcessingSourceType.manual
      }
    );
  }

  public async processMicrosoftTranscript(params: {
    userId: string;
    userName: string;
    userEmail: string;
    transcriptText: string;
    transcriptLabel?: string | null;
    meetingId: string;
    transcriptId: string;
    meetingTitle: string;
    projectName?: string | null;
    meetingStartTime?: Date | null;
    meetingEndTime?: Date | null;
    processingMode: MicrosoftProcessingMode;
  }) {
    return this.processFromAdapter(
      {
        microsoftTranscript: {
          transcriptText: params.transcriptText,
          transcriptLabel: params.transcriptLabel
        }
      },
      {
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        sourceType: ProcessingSourceType.microsoft_teams,
        sourceLabel: params.transcriptLabel ?? "Microsoft Teams transcript",
        meetingId: params.meetingId,
        transcriptId: params.transcriptId,
        meetingTitle: params.meetingTitle,
        projectName: params.projectName ?? null,
        meetingStartTime: params.meetingStartTime ?? null,
        meetingEndTime: params.meetingEndTime ?? null,
        processingMode: params.processingMode
      }
    );
  }

  public async resendEmail(input: EmailTranscriptInput) {
    const record = await this.historyService.getRecord(input.historyId);
    if (!record) {
      throw new HttpError(404, "History record not found.");
    }

    await this.emailService.sendMeetingResults({
      to: input.email ?? record.userEmail,
      userName: record.userName ?? "Unknown User",
      meetingTitle: record.meetingTitle ?? "Meeting Summary",
      overallSummary: record.overallSummary,
      pdfPath: record.generatedPdfPath,
      excelPath: record.generatedExcelPath,
      pdfUrl: record.generatedPdfUrl ?? undefined,
      excelUrl: record.generatedExcelUrl ?? undefined
    });

    await this.historyService.markEmailSent(record.id, { emailSent: true, emailError: null });
    return { sent: true };
  }

  public async getHistory(userId: string) {
    const items = await this.historyService.listHistory(userId);
    return items.map((item) => this.historyService.toSummary(item));
  }

  private async processFromAdapter(
    ingestionPayload: TranscriptIngestionPayload,
    workflow: {
      userId: string;
      userName: string;
      userEmail: string;
      sourceType: ProcessingSourceType;
      sourceLabel?: string | null;
      processingMode?: MicrosoftProcessingMode;
      meetingId?: string | null;
      transcriptId?: string | null;
      meetingTitle: string;
      projectName: string | null;
      meetingStartTime?: Date | null;
      meetingEndTime?: Date | null;
      customColumns?: string[];
    }
  ) {
    const adapter = this.adapters.find((candidate) => candidate.canHandle(ingestionPayload));
    if (!adapter) {
      throw new HttpError(400, "No transcript ingestion adapter could handle this request.");
    }

    const ingested = await adapter.ingest(ingestionPayload);

    return this.meetingProcessingService.processMeetingTranscriptWorkflow({
      userId: workflow.userId,
      userName: workflow.userName,
      userEmail: workflow.userEmail,
      sourceType: workflow.sourceType,
      sourceLabel: workflow.sourceLabel ?? ingested.sourceLabel,
      processingMode: workflow.processingMode,
      meetingId: workflow.meetingId,
      transcriptId: workflow.transcriptId,
      meetingTitle: workflow.meetingTitle,
      projectName: workflow.projectName,
      meetingStartTime: workflow.meetingStartTime,
      meetingEndTime: workflow.meetingEndTime,
      transcriptText: ingested.transcriptText,
      customColumns: workflow.customColumns
    });
  }
}
