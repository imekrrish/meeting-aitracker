import { type NextFunction, type Response } from "express";
import { prisma } from "../services/storage/prisma.service";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { HttpError } from "../utils/http-error";
import { transcriptSubscriptionService } from "../services/singletons";
import { z } from "zod";

const settingsSchema = z.object({
  automationEnabled: z.boolean().optional(),
  processingMode: z.enum(["tagged_meetings_only", "organizer_only"]).optional()
});

export class MicrosoftController {
  public async status(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new HttpError(401, "Authentication required.");
      }

      const integration = await prisma.microsoftIntegration.findUnique({
        where: { userId: req.userId }
      });

      if (integration?.automationEnabled) {
        await transcriptSubscriptionService.ensureSubscriptionForIntegration(integration.id);
      }

      const refreshed = await prisma.microsoftIntegration.findUnique({
        where: { userId: req.userId }
      });

      res.json({
        success: true,
        data: refreshed
          ? {
          connected: true,
          email: refreshed.email,
          displayName: refreshed.displayName,
          automationEnabled: refreshed.automationEnabled,
          processingMode: refreshed.processingMode,
          grantedScopes: refreshed.grantedScopes,
          subscriptionExpiresAt: refreshed.subscriptionExpiresAt,
          lastSyncError: refreshed.lastSyncError
        }
          : {
            connected: false,
            automationEnabled: false,
            processingMode: "tagged_meetings_only",
            grantedScopes: null,
            subscriptionExpiresAt: null,
            lastSyncError: null
          }
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new HttpError(401, "Authentication required.");
      }

      const payload = settingsSchema.parse(req.body);
      const integration = await prisma.microsoftIntegration.findUnique({
        where: { userId: req.userId }
      });

      if (!integration) {
        throw new HttpError(404, "Microsoft integration not found for this user.");
      }

      const updated = await prisma.microsoftIntegration.update({
        where: { id: integration.id },
        data: {
          automationEnabled: payload.automationEnabled ?? integration.automationEnabled,
          processingMode: payload.processingMode ?? integration.processingMode
        }
      });

      if (updated.automationEnabled) {
        await transcriptSubscriptionService.ensureSubscriptionForIntegration(updated.id);
      }

      res.json({
        success: true,
        data: {
          connected: true,
          email: updated.email,
          displayName: updated.displayName,
          automationEnabled: updated.automationEnabled,
          processingMode: updated.processingMode,
          grantedScopes: updated.grantedScopes,
          subscriptionExpiresAt: updated.subscriptionExpiresAt,
          lastSyncError: updated.lastSyncError
        }
      });
    } catch (error) {
      next(error);
    }
  }
}
