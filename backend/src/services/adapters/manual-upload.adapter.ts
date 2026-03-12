import { HttpError } from "../../utils/http-error";
import { sanitizePlainText } from "../../utils/sanitize";
import type {
  TranscriptIngestionPayload,
  TranscriptIngestionResult,
  TranscriptSourceAdapter
} from "./transcript-source-adapter";

export class ManualUploadAdapter implements TranscriptSourceAdapter {
  public readonly sourceType = "manual_upload";

  public canHandle(payload: TranscriptIngestionPayload): boolean {
    return Boolean(payload.file || payload.transcriptText?.trim());
  }

  public async ingest(payload: TranscriptIngestionPayload): Promise<TranscriptIngestionResult> {
    if (payload.file) {
      const extension = payload.file.originalname.split(".").pop()?.toLowerCase();
      if (extension !== "txt") {
        throw new HttpError(400, "Only .txt transcript uploads are supported in this MVP.");
      }

      const transcriptText = sanitizePlainText(payload.file.buffer.toString("utf8"));
      if (!transcriptText) {
        throw new HttpError(400, "Uploaded transcript file is empty.");
      }

      return {
        sourceType: this.sourceType,
        sourceLabel: payload.file.originalname,
        transcriptText
      };
    }

    const transcriptText = sanitizePlainText(payload.transcriptText ?? "");
    if (!transcriptText) {
      throw new HttpError(400, "Transcript text is required.");
    }

    return {
      sourceType: this.sourceType,
      sourceLabel: "Pasted transcript",
      transcriptText
    };
  }
}

