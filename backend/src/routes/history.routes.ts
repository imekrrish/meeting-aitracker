import { Router } from "express";
import { transcriptController } from "../controllers/transcript.controller";
import { asyncHandler } from "../utils/async-handler";

export const historyRouter = Router();

historyRouter.get("/", asyncHandler((req, res) => transcriptController.history(req, res)));

