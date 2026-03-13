import { randomBytes } from "crypto";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";
import { sanitizeOptionalText, sanitizePlainText } from "../utils/sanitize";
import type { EmailTranscriptInput, ProcessTranscriptInput } from "../validators/transcript.validator";
import { ManualUploadAdapter } from "./adapters/manual-upload.adapter";
import type { TranscriptIngestionPayload, TranscriptSourceAdapter } from "./adapters/transcript-source-adapter";
import { EmailService } from "./email.service";
import { ExcelService } from "./excel.service";
import { HistoryService } from "./history.service";
import { OpenAIService } from "./openai.service";
import { PdfService } from "./pdf.service";
import { ArtifactService } from "./storage/artifact.service";
import { TranscriptNormalizerService } from "./transcript-normalizer.service";

export class TranscriptProcessingService {
  private readonly adapters: TranscriptSourceAdapter[] = [new ManualUploadAdapter()];
  private readonly normalizerService = new TranscriptNormalizerService();
  private readonly openAIService = new OpenAIService();
  private readonly excelService = new ExcelService();
  private readonly pdfService = new PdfService();
  private readonly emailService = new EmailService();
  private readonly historyService = new HistoryService();
  private readonly artifactService = new ArtifactService();

  public validateFile(file?: Express.Multer.File) {
    if (!file) {
      return;
    }

    const allowedMimeTypes = ["text/plain"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpError(400, "Only plain text transcript files are supported.");
    }

    const maxSizeBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new HttpError(400, `File exceeds ${env.MAX_UPLOAD_SIZE_MB}MB limit.`);
    }
  }

  public async process(input: ProcessTranscriptInput, file: Express.Multer.File | undefined, userId: string) {
    const sanitizedInput = {
      fullName: input.fullName ? sanitizePlainText(input.fullName) : null,
      email: sanitizePlainText(input.email),
      meetingTitle: input.meetingTitle ? sanitizePlainText(input.meetingTitle) : null,
      projectName: sanitizeOptionalText(input.projectName),
      transcriptText: input.transcriptText ? sanitizePlainText(input.transcriptText) : undefined,
      customColumns: input.customColumns
    };

    const ingestionPayload: TranscriptIngestionPayload = {
      transcriptText: sanitizedInput.transcriptText,
      file
    };

    const adapter = this.adapters.find((candidate) => candidate.canHandle(ingestionPayload));
    if (!adapter) {
      throw new HttpError(400, "No transcript ingestion adapter could handle this request.");
    }

    const ingested = await adapter.ingest(ingestionPayload);
    const normalizedTranscript = this.normalizerService.normalize(ingested.transcriptText);
    const insights = await this.openAIService.extractMeetingInsights({
      meetingTitle: sanitizedInput.meetingTitle ?? "Meeting Summary",
      projectName: sanitizedInput.projectName,
      transcriptText: normalizedTranscript,
      customColumns: sanitizedInput.customColumns
    });

    const historyId = randomBytes(12).toString("hex");
    const outputDir = await this.artifactService.ensureHistoryDir(historyId);
    const excelPath = await this.excelService.generateWorkbook({
      outputDir,
      meetingTitle: sanitizedInput.meetingTitle ?? "Meeting Summary",
      projectName: sanitizedInput.projectName,
      userName: sanitizedInput.fullName ?? "Unknown User",
      insights,
      customColumns: sanitizedInput.customColumns
    });
    const pdfPath = await this.pdfService.generatePdf({
      outputDir,
      meetingTitle: sanitizedInput.meetingTitle ?? "Meeting Summary",
      projectName: sanitizedInput.projectName,
      userName: sanitizedInput.fullName ?? "Unknown User",
      insights
    });

    let emailResult = {
      sent: false,
      message: "Email functionality is temporarily disabled. Please download your files."
    };

    // try {
    //   await this.emailService.sendMeetingResults({
    //     to: sanitizedInput.email,
    //     userName: sanitizedInput.fullName ?? "User",
    //     meetingTitle: sanitizedInput.meetingTitle ?? "Meeting Summary",
    //     overallSummary: insights.overallSummary,
    //     pdfPath,
    //     excelPath
    //   });
    //   emailResult = {
    //     sent: true,
    //     message: "Email sent successfully."
    //   };
    // } catch (error) {
    //   emailResult = {
    //     sent: false,
    //     message:
    //       error instanceof Error ? `Email failed: ${error.message}` : "Email failed. Downloads are still available."
    //   };
    // }

    const record = await this.historyService.createRecord({
      id: historyId,
      userId,
      userName: sanitizedInput.fullName ?? "Unknown User",
      userEmail: sanitizedInput.email,
      meetingTitle: sanitizedInput.meetingTitle ?? "Meeting Summary",
      projectName: sanitizedInput.projectName,
      transcriptText: normalizedTranscript,
      insights,
      generatedExcelPath: excelPath,
      generatedPdfPath: pdfPath,
      emailSent: emailResult.sent
    });

    return {
      historyId: record.id,
      meetingTitle: sanitizedInput.meetingTitle ?? "Meeting Summary",
      projectName: sanitizedInput.projectName,
      source: {
        type: ingested.sourceType,
        label: ingested.sourceLabel
      },
      normalizedTranscriptPreview: normalizedTranscript.slice(0, 220),
      downloads: {
        excelUrl: this.artifactService.toPublicUrl(excelPath),
        pdfUrl: this.artifactService.toPublicUrl(pdfPath)
      },
      email: emailResult,
      insights
    };
  }

  public async resendEmail(input: EmailTranscriptInput) {
    const record = await this.historyService.getRecord(input.historyId);
    if (!record) {
      throw new HttpError(404, "History record not found.");
    }

    await this.emailService.sendMeetingResults({
      to: input.email ?? record.userEmail,
      userName: record.userName ?? "Unknown User",
      meetingTitle: record.meetingTitle ?? "Meeting Summary",
      overallSummary: record.overallSummary,
      pdfPath: record.generatedPdfPath,
      excelPath: record.generatedExcelPath
    });

    await this.historyService.markEmailSent(record.id, true);
    return { sent: true };
  }

  public async getHistory(userId: string) {
    const items = await this.historyService.listHistory(userId);
    return items.map((item: any) => ({
      id: item.id,
      userName: item.userName,
      userEmail: item.userEmail,
      meetingTitle: item.meetingTitle,
      projectName: item.projectName,
      overallSummary: item.overallSummary,
      generatedExcelUrl: this.artifactService.toPublicUrl(item.generatedExcelPath),
      generatedPdfUrl: this.artifactService.toPublicUrl(item.generatedPdfPath),
      emailSent: item.emailSent,
      createdAt: item.createdAt
    }));
  }
}

