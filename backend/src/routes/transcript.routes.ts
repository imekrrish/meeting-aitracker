import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import { transcriptController } from "../controllers/transcript.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024
  }
});

export const transcriptRouter = Router();

transcriptRouter.post(
  "/process",
  authMiddleware,
  upload.single("transcriptFile"),
  asyncHandler((req, res) => transcriptController.process(req, res))
);

transcriptRouter.post(
  "/email",
  authMiddleware,
  asyncHandler((req, res) => transcriptController.resendEmail(req, res))
);
