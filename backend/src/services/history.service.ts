import { ProcessingSourceType, ProcessingStatus, type MicrosoftProcessingMode, type Prisma } from "@prisma/client";
import type { MeetingInsight } from "../types/meeting-insight";
import { prisma } from "./storage/prisma.service";

export class HistoryService {
  public async createRecord(params: {
    userId: string;
    userName: string | null;
    userEmail: string;
    sourceType: ProcessingSourceType;
    status?: ProcessingStatus;
    processingMode?: MicrosoftProcessingMode;
    meetingId?: string | null;
    transcriptId?: string | null;
    sourceLabel?: string | null;
    meetingTitle?: string | null;
    projectName?: string | null;
    meetingStartTime?: Date | null;
    meetingEndTime?: Date | null;
    transcriptText: string;
    insights: MeetingInsight;
    generatedExcelPath: string;
    generatedPdfPath: string;
    generatedExcelUrl?: string | null;
    generatedPdfUrl?: string | null;
    generatedExcelPublicId?: string | null;
    generatedPdfPublicId?: string | null;
    emailSent: boolean;
    emailError?: string | null;
  }) {
    return prisma.processingHistory.create({
      data: {
        userId: params.userId,
        userName: params.userName ?? "Unknown User",
        userEmail: params.userEmail,
        sourceType: params.sourceType,
        status: params.status ?? ProcessingStatus.completed,
        processingMode: params.processingMode,
        meetingId: params.meetingId,
        transcriptId: params.transcriptId,
        sourceLabel: params.sourceLabel,
        meetingTitle: params.meetingTitle ?? "Meeting Summary",
        projectName: params.projectName,
        meetingStartTime: params.meetingStartTime,
        meetingEndTime: params.meetingEndTime,
        transcriptText: params.transcriptText,
        overallSummary: params.insights.overallSummary,
        managerSummary: params.insights.managerSummary,
        structuredJson: JSON.stringify(params.insights),
        generatedExcelPath: params.generatedExcelPath,
        generatedPdfPath: params.generatedPdfPath,
        generatedExcelUrl: params.generatedExcelUrl,
        generatedPdfUrl: params.generatedPdfUrl,
        generatedExcelPublicId: params.generatedExcelPublicId,
        generatedPdfPublicId: params.generatedPdfPublicId,
        emailSent: params.emailSent,
        emailError: params.emailError
      }
    });
  }

  public async createFailedRecord(params: {
    userId: string;
    userName: string | null;
    userEmail: string;
    sourceType: ProcessingSourceType;
    processingMode?: MicrosoftProcessingMode;
    meetingId?: string | null;
    transcriptId?: string | null;
    sourceLabel?: string | null;
    meetingTitle?: string | null;
    projectName?: string | null;
    meetingStartTime?: Date | null;
    meetingEndTime?: Date | null;
    transcriptText: string;
    errorMessage: string;
  }) {
    return prisma.processingHistory.create({
      data: {
        userId: params.userId,
        userName: params.userName ?? "Unknown User",
        userEmail: params.userEmail,
        sourceType: params.sourceType,
        status: ProcessingStatus.failed,
        processingMode: params.processingMode,
        meetingId: params.meetingId,
        transcriptId: params.transcriptId,
        sourceLabel: params.sourceLabel,
        meetingTitle: params.meetingTitle ?? "Meeting Summary",
        projectName: params.projectName,
        meetingStartTime: params.meetingStartTime,
        meetingEndTime: params.meetingEndTime,
        transcriptText: params.transcriptText,
        overallSummary: params.errorMessage,
        managerSummary: null,
        structuredJson: JSON.stringify({ error: params.errorMessage }),
        generatedExcelPath: "",
        generatedPdfPath: "",
        emailSent: false,
        emailError: params.errorMessage
      }
    });
  }

  public async listHistory(userId: string) {
    return prisma.processingHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
  }

  public async getRecord(historyId: string) {
    return prisma.processingHistory.findUnique({
      where: { id: historyId }
    });
  }

  public async getRecordForUser(historyId: string, userId: string) {
    return prisma.processingHistory.findFirst({
      where: {
        id: historyId,
        userId
      }
    });
  }

  public async markEmailSent(historyId: string, params: { emailSent: boolean; emailError?: string | null }) {
    return prisma.processingHistory.update({
      where: { id: historyId },
      data: {
        emailSent: params.emailSent,
        emailError: params.emailError
      }
    });
  }

  public async findByMeetingTranscript(params: { userId: string; meetingId: string; transcriptId: string }) {
    return prisma.processingHistory.findFirst({
      where: {
        userId: params.userId,
        meetingId: params.meetingId,
        transcriptId: params.transcriptId
      }
    });
  }

  public toSummary(record: Prisma.ProcessingHistoryGetPayload<object>) {
    const structuredJson = this.parseStructuredJson(record.structuredJson);
    return {
      id: record.id,
      userName: record.userName,
      userEmail: record.userEmail,
      sourceType: record.sourceType,
      status: record.status,
      processingMode: record.processingMode,
      meetingId: record.meetingId,
      transcriptId: record.transcriptId,
      meetingTitle: record.meetingTitle,
      projectName: record.projectName,
      meetingStartTime: record.meetingStartTime,
      meetingEndTime: record.meetingEndTime,
      overallSummary: record.overallSummary,
      summaryPreview: record.overallSummary.slice(0, 240),
      generatedExcelUrl: record.generatedExcelUrl,
      generatedPdfUrl: record.generatedPdfUrl,
      emailSent: record.emailSent,
      emailError: record.emailError,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      structuredJson
    };
  }

  private parseStructuredJson(payload: string) {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
}
