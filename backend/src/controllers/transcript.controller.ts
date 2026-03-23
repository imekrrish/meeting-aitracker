import type { Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { HttpError } from "../utils/http-error";
import { emailTranscriptSchema, processTranscriptSchema } from "../validators/transcript.validator";

export class TranscriptController {
  private async getTranscriptProcessingService() {
    const { TranscriptProcessingService } = await import("../services/transcript-processing.service");
    return new TranscriptProcessingService();
  }

  public async process(req: AuthenticatedRequest, res: Response) {
    const transcriptProcessingService = await this.getTranscriptProcessingService();
    transcriptProcessingService.validateFile(req.file);

    const transcriptText =
      typeof req.body.transcriptText === "string" && req.body.transcriptText.trim().length > 0
        ? req.body.transcriptText
        : req.file
          ? "__file_present__"
          : undefined;

    let parsedCustomColumns: string[] | undefined = undefined;
    if (typeof req.body.customColumns === "string") {
      try {
        parsedCustomColumns = JSON.parse(req.body.customColumns);
      } catch {
        parsedCustomColumns = undefined;
      }
    }

    // Use JWT user info instead of form body
    const candidate = {
      fullName: req.userName ?? req.body.fullName,
      email: req.userEmail!,
      meetingTitle: req.body.meetingTitle,
      projectName: req.body.projectName,
      transcriptText,
      customColumns: parsedCustomColumns
    };

    const parsed = processTranscriptSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
    }

    const payload = {
      ...parsed.data,
      transcriptText: req.body.transcriptText
    };

    const result = await transcriptProcessingService.process(payload, req.file, {
      userId: req.userId!,
      name: req.userName!,
      email: req.userEmail!
    });
    return res.status(200).json({
      success: true,
      data: result
    });
  }

  public async resendEmail(req: AuthenticatedRequest, res: Response) {
    const transcriptProcessingService = await this.getTranscriptProcessingService();
    const parsed = emailTranscriptSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid email request.");
    }

    const result = await transcriptProcessingService.resendEmail(parsed.data);
    return res.status(200).json({ success: true, data: result });
  }
}

export const transcriptController = new TranscriptController();
