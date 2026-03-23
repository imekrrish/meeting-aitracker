import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { transcriptFetchService } from "../services/singletons";

export class WebhookController {
  public async handleMicrosoftTranscriptWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      if (typeof req.query.validationToken === "string") {
        return res.status(200).send(req.query.validationToken);
      }

      const notifications = Array.isArray(req.body?.value) ? req.body.value : [];
      console.log("[Microsoft Webhook] Received notifications:", notifications.length);

      const relevantNotifications = notifications.filter((notification: any) => {
        if (!notification?.resource || typeof notification.resource !== "string") {
          return false;
        }

        if (env.MICROSOFT_SUBSCRIPTION_SECRET && notification.clientState) {
          return true;
        }

        return true;
      });

      res.status(202).json({
        success: true,
        data: {
          accepted: relevantNotifications.length
        }
      });

      for (const notification of relevantNotifications) {
        try {
          await transcriptFetchService.handleTranscriptReadyNotification({
            subscriptionId: typeof notification.subscriptionId === "string" ? notification.subscriptionId : undefined,
            clientState: typeof notification.clientState === "string" ? notification.clientState : undefined,
            resource: notification.resource
          });
        } catch (error) {
          console.error("[Microsoft Webhook] Notification processing failed:", error);
        }
      }
    } catch (error) {
      next(error);
    }
  }
}
