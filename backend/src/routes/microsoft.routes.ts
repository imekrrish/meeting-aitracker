import { Router } from "express";
import { MicrosoftController } from "../controllers/microsoft.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new MicrosoftController();
export const microsoftRouter = Router();

microsoftRouter.get("/status", authMiddleware, (req, res, next) => controller.status(req, res, next));
microsoftRouter.patch("/settings", authMiddleware, (req, res, next) => controller.updateSettings(req, res, next));
