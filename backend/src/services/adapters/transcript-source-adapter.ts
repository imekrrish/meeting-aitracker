export type TranscriptIngestionPayload = {
  transcriptText?: string;
  file?: Express.Multer.File;
  microsoftTranscript?: {
    transcriptText: string;
    transcriptLabel?: string | null;
  };
};

export type TranscriptIngestionResult = {
  sourceType: string;
  sourceLabel: string | null;
  transcriptText: string;
};

export interface TranscriptSourceAdapter {
  readonly sourceType: string;
  canHandle(payload: TranscriptIngestionPayload): boolean;
  ingest(payload: TranscriptIngestionPayload): Promise<TranscriptIngestionResult>;
}

