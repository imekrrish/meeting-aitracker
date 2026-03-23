import { Router } from "express";
import { MeetingHistoryController } from "../controllers/meeting-history.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const historyRouter = Router();
const controller = new MeetingHistoryController();

historyRouter.get("/", authMiddleware, asyncHandler((req, res, next) => controller.list(req, res, next)));
