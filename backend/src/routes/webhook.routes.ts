import { Router } from "express";
import { WebhookController } from "../controllers/webhook.controller";

const controller = new WebhookController();
export const webhookRouter = Router();

webhookRouter.post("/microsoft/transcripts", (req, res, next) =>
  controller.handleMicrosoftTranscriptWebhook(req, res, next)
);
