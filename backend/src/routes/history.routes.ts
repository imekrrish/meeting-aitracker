import { Router } from "express";
import { transcriptController } from "../controllers/transcript.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const historyRouter = Router();

historyRouter.get("/", authMiddleware, asyncHandler((req, res) => transcriptController.history(req, res)));
