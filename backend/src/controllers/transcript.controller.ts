import type { Request, Response } from "express";
import { TranscriptProcessingService } from "../services/transcript-processing.service";
import { HttpError } from "../utils/http-error";
import { emailTranscriptSchema, processTranscriptSchema } from "../validators/transcript.validator";

const transcriptProcessingService = new TranscriptProcessingService();

export class TranscriptController {
  public async process(req: Request, res: Response) {
    transcriptProcessingService.validateFile(req.file);

    const transcriptText =
      typeof req.body.transcriptText === "string" && req.body.transcriptText.trim().length > 0
        ? req.body.transcriptText
        : req.file
          ? "__file_present__"
          : undefined;

    const candidate = {
      fullName: req.body.fullName,
      email: req.body.email,
      meetingTitle: req.body.meetingTitle,
      projectName: req.body.projectName,
      transcriptText
    };

    const parsed = processTranscriptSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
    }

    const payload = {
      ...parsed.data,
      transcriptText: req.body.transcriptText
    };

    const result = await transcriptProcessingService.process(payload, req.file);
    return res.status(200).json({
      success: true,
      data: result
    });
  }

  public async resendEmail(req: Request, res: Response) {
    const parsed = emailTranscriptSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid email request.");
    }

    const result = await transcriptProcessingService.resendEmail(parsed.data);
    return res.status(200).json({ success: true, data: result });
  }

  public async history(_req: Request, res: Response) {
    const items = await transcriptProcessingService.getHistory();
    return res.status(200).json({ success: true, data: items });
  }
}

export const transcriptController = new TranscriptController();
