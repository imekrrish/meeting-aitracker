import { HttpError } from "../../utils/http-error";
import { sanitizePlainText } from "../../utils/sanitize";
import type {
  TranscriptIngestionPayload,
  TranscriptIngestionResult,
  TranscriptSourceAdapter
} from "./transcript-source-adapter";

export class MicrosoftTeamsAdapter implements TranscriptSourceAdapter {
  public readonly sourceType = "microsoft_teams";

  public canHandle(payload: TranscriptIngestionPayload): boolean {
    return Boolean(payload.microsoftTranscript?.transcriptText?.trim());
  }

  public async ingest(payload: TranscriptIngestionPayload): Promise<TranscriptIngestionResult> {
    const transcriptText = sanitizePlainText(payload.microsoftTranscript?.transcriptText ?? "");
    if (!transcriptText) {
      throw new HttpError(400, "Microsoft transcript text is empty.");
    }

    return {
      sourceType: this.sourceType,
      sourceLabel: payload.microsoftTranscript?.transcriptLabel ?? "Microsoft Teams transcript",
      transcriptText
    };
  }
}
