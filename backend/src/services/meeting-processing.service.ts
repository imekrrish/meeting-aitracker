import { ProcessingSourceType, type MicrosoftProcessingMode } from "@prisma/client";
import { randomBytes } from "crypto";
import { sanitizeOptionalText, sanitizePlainText } from "../utils/sanitize";
import { ExcelService } from "./excel.service";
import { HistoryService } from "./history.service";
import { OpenAIService } from "./openai.service";
import { PdfService } from "./pdf.service";
import { TranscriptNormalizerService } from "./transcript-normalizer.service";
import { ArtifactService } from "./storage/artifact.service";
import { EmailService } from "./email.service";
import { CloudinaryService } from "./cloudinary.service";

export class MeetingProcessingService {
  private readonly normalizerService = new TranscriptNormalizerService();
  private readonly openAIService = new OpenAIService();
  private readonly excelService = new ExcelService();
  private readonly pdfService = new PdfService();
  private readonly emailService = new EmailService();
  private readonly historyService = new HistoryService();
  private readonly artifactService = new ArtifactService();
  private readonly cloudinaryService = new CloudinaryService();

  public async processMeetingTranscriptWorkflow(params: {
    userId: string;
    userName: string;
    userEmail: string;
    sourceType: ProcessingSourceType;
    sourceLabel?: string | null;
    processingMode?: MicrosoftProcessingMode;
    meetingId?: string | null;
    transcriptId?: string | null;
    meetingTitle?: string | null;
    projectName?: string | null;
    meetingStartTime?: Date | null;
    meetingEndTime?: Date | null;
    transcriptText: string;
    customColumns?: string[];
  }) {
    const sanitizedInput = {
      userName: sanitizePlainText(params.userName),
      userEmail: sanitizePlainText(params.userEmail),
      meetingTitle: params.meetingTitle ? sanitizePlainText(params.meetingTitle) : "Meeting Summary",
      projectName: sanitizeOptionalText(params.projectName),
      transcriptText: sanitizePlainText(params.transcriptText)
    };

    const normalizedTranscript = this.normalizerService.normalize(sanitizedInput.transcriptText);
    const insights = await this.openAIService.extractMeetingInsights({
      meetingTitle: sanitizedInput.meetingTitle,
      projectName: sanitizedInput.projectName,
      transcriptText: normalizedTranscript,
      customColumns: params.customColumns
    });

    const historyId = randomBytes(12).toString("hex");
    const outputDir = await this.artifactService.ensureHistoryDir(historyId);
    const excelPath = await this.excelService.generateWorkbook({
      outputDir,
      meetingTitle: sanitizedInput.meetingTitle,
      projectName: sanitizedInput.projectName,
      userName: sanitizedInput.userName,
      insights,
      customColumns: params.customColumns
    });
    let pdfPath: string | null = null;
    let pdfError: string | null = null;
    try {
      pdfPath = await this.pdfService.generatePdf({
        outputDir,
        meetingTitle: sanitizedInput.meetingTitle,
        projectName: sanitizedInput.projectName,
        userName: sanitizedInput.userName,
        insights
      });
    } catch (error) {
      pdfError = error instanceof Error ? error.message : "PDF generation failed.";
      console.error("[Meeting Processing] PDF generation failed. Continuing with Excel only.", pdfError);
    }

    let generatedExcelUrl = this.artifactService.toPublicUrl(excelPath);
    let generatedPdfUrl: string | null = pdfPath ? this.artifactService.toPublicUrl(pdfPath) : null;
    let generatedExcelPublicId: string | null = null;
    let generatedPdfPublicId: string | null = null;

    if (this.cloudinaryService.isConfigured()) {
      const folder = `meeting-tracker/${params.userId}`;
      const excelUpload = await this.cloudinaryService.uploadArtifact(excelPath, {
        folder,
        publicId: this.cloudinaryService.buildArtifactPublicId(historyId, excelPath)
      });

      generatedExcelUrl = excelUpload.secureUrl;
      generatedExcelPublicId = excelUpload.publicId;

      if (pdfPath) {
        const pdfUpload = await this.cloudinaryService.uploadArtifact(pdfPath, {
          folder,
          publicId: this.cloudinaryService.buildArtifactPublicId(historyId, pdfPath)
        });

        generatedPdfUrl = pdfUpload.secureUrl;
        generatedPdfPublicId = pdfUpload.publicId;
      }
    }

    let emailSent = false;
    let emailError: string | null = pdfError;
    try {
      await this.emailService.sendMeetingResults({
        to: sanitizedInput.userEmail,
        userName: sanitizedInput.userName,
        meetingTitle: sanitizedInput.meetingTitle,
        overallSummary: insights.overallSummary,
        pdfPath,
        excelPath,
        pdfUrl: generatedPdfUrl ?? undefined,
        excelUrl: generatedExcelUrl
      });
      emailSent = true;
    } catch (error) {
      const smtpError = error instanceof Error ? error.message : "Email delivery failed.";
      emailError = [pdfError, smtpError].filter(Boolean).join(" | ");
    }

    const record = await this.historyService.createRecord({
      userId: params.userId,
      userName: sanitizedInput.userName,
      userEmail: sanitizedInput.userEmail,
      sourceType: params.sourceType,
      processingMode: params.processingMode,
      meetingId: params.meetingId,
      transcriptId: params.transcriptId,
      sourceLabel: params.sourceLabel,
      meetingTitle: sanitizedInput.meetingTitle,
      projectName: sanitizedInput.projectName,
      meetingStartTime: params.meetingStartTime,
      meetingEndTime: params.meetingEndTime,
      transcriptText: normalizedTranscript,
      insights,
      generatedExcelPath: excelPath,
      generatedPdfPath: pdfPath ?? "",
      generatedExcelUrl,
      generatedPdfUrl,
      generatedExcelPublicId,
      generatedPdfPublicId,
      emailSent,
      emailError
    });

    return {
      historyId: record.id,
      meetingTitle: sanitizedInput.meetingTitle,
      projectName: sanitizedInput.projectName,
      source: {
        type: params.sourceType,
        label: params.sourceLabel ?? "Transcript"
      },
      normalizedTranscriptPreview: normalizedTranscript.slice(0, 220),
      downloads: {
        excelUrl: generatedExcelUrl,
        pdfUrl: generatedPdfUrl
      },
      email: {
        sent: emailSent,
        message: emailSent
          ? pdfError
            ? `Email sent successfully. PDF generation failed, so only Excel is available. ${pdfError}`
            : "Email sent successfully."
          : emailError ?? "Email failed. Files were still saved successfully."
      },
      insights
    };
  }
}
