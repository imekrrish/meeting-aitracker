import { Router } from "express";
import { MeetingHistoryController } from "../controllers/meeting-history.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const controller = new MeetingHistoryController();
export const meetingHistoryRouter = Router();

meetingHistoryRouter.get("/history", authMiddleware, (req, res, next) => controller.list(req, res, next));
meetingHistoryRouter.get("/:id", authMiddleware, (req, res, next) => controller.detail(req, res, next));
meetingHistoryRouter.get("/:id/download/excel", authMiddleware, (req, res, next) =>
  controller.downloadExcel(req, res, next)
);
meetingHistoryRouter.get("/:id/download/pdf", authMiddleware, (req, res, next) =>
  controller.downloadPdf(req, res, next)
);
