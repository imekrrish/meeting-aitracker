import { prisma } from "./storage/prisma.service";
import { MicrosoftGraphService } from "./microsoftGraph.service";
import { env } from "../config/env";
import { randomBytes } from "crypto";
import { HttpError } from "../utils/http-error";

export class TranscriptSubscriptionService {
  private readonly graphService = new MicrosoftGraphService();
  private readonly consumerTenantId = "9188040d-6c67-4c5b-b112-36a304b66dad";
  private readonly requiredAutomationScopes = [
    "OnlineMeetingTranscript.Read.All",
    "OnlineMeetings.Read"
  ];

  public async ensureSubscriptionForIntegration(integrationId: string) {
    const integration = await prisma.microsoftIntegration.findUnique({
      where: { id: integrationId },
      include: { user: true }
    });

    if (!integration) {
      throw new HttpError(404, "Microsoft integration not found.");
    }

    if (!env.MICROSOFT_WEBHOOK_URL) {
      await prisma.microsoftIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncError: "MICROSOFT_WEBHOOK_URL is not configured. Transcript automation is disabled."
        }
      });
      return null;
    }

    if (integration.tenantId === this.consumerTenantId) {
      await prisma.microsoftIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncError:
            "Teams transcript automation requires a Microsoft work or school account. Personal Microsoft accounts are not supported for delegated transcript subscriptions."
        }
      });
      return null;
    }

    if (!this.hasAutomationScopes(integration.grantedScopes)) {
      await prisma.microsoftIntegration.update({
        where: { id: integration.id },
        data: {
          lastSyncError:
            "Automation consent not granted yet. Use 'Enable Teams Automation' with a work or school account after admin approval."
        }
      });
      return null;
    }

    const refreshed = await this.ensureFreshToken(integration.id);
    const clientState = integration.subscriptionClientState ?? randomBytes(16).toString("hex");
    const renewalCutoff = new Date(
      Date.now() + env.MICROSOFT_SUBSCRIPTION_RENEW_WINDOW_MINUTES * 60 * 1000
    );

    const subscription =
      refreshed.subscriptionId && refreshed.subscriptionExpiresAt && refreshed.subscriptionExpiresAt > renewalCutoff
        ? {
          id: refreshed.subscriptionId,
          resource: refreshed.subscriptionResource ?? "",
          expirationDateTime: refreshed.subscriptionExpiresAt.toISOString(),
          clientState
        }
        : refreshed.subscriptionId
          ? await this.graphService.renewTranscriptSubscription({
            accessToken: refreshed.accessToken,
            subscriptionId: refreshed.subscriptionId
          })
          : await this.graphService.createTranscriptSubscription({
            accessToken: refreshed.accessToken,
            microsoftUserId: refreshed.microsoftUserId,
            notificationUrl: env.MICROSOFT_WEBHOOK_URL,
            lifecycleNotificationUrl: env.MICROSOFT_WEBHOOK_URL,
            clientState
          });

    return prisma.microsoftIntegration.update({
      where: { id: integration.id },
      data: {
        subscriptionId: subscription.id,
        subscriptionResource: subscription.resource,
        subscriptionClientState: clientState,
        subscriptionExpiresAt: new Date(subscription.expirationDateTime),
        lastSyncError: null
      }
    });
  }

  public async renewExpiringSubscriptions() {
    const renewalCutoff = new Date(
      Date.now() + env.MICROSOFT_SUBSCRIPTION_RENEW_WINDOW_MINUTES * 60 * 1000
    );

    const integrations = await prisma.microsoftIntegration.findMany({
      where: {
        automationEnabled: true,
        OR: [
          { subscriptionId: null },
          { subscriptionExpiresAt: null },
          { subscriptionExpiresAt: { lte: renewalCutoff } }
        ]
      }
    });

    for (const integration of integrations) {
      try {
        await this.ensureSubscriptionForIntegration(integration.id);
      } catch (error) {
        await prisma.microsoftIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncError: error instanceof Error ? error.message : "Subscription renewal failed."
          }
        });
      }
    }
  }

  private async ensureFreshToken(integrationId: string) {
    const integration = await prisma.microsoftIntegration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      throw new HttpError(404, "Microsoft integration not found.");
    }

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
        grantedScopes: refreshed.scope ?? integration.grantedScopes,
        tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        lastSyncError: null
      }
    });
  }

  private hasAutomationScopes(grantedScopes: string | null) {
    if (!grantedScopes) {
      return false;
    }

    return this.requiredAutomationScopes.every((scope) => grantedScopes.split(/\s+/).includes(scope));
  }
}
