import type { MeetingInsight } from "../types/meeting-insight";
import { prisma } from "./storage/prisma.service";

export class HistoryService {
  public async createRecord(params: {
    id: string;
    userName: string;
    userEmail: string;
    meetingTitle: string;
    projectName: string | null;
    transcriptText: string;
    insights: MeetingInsight;
    generatedExcelPath: string;
    generatedPdfPath: string;
    emailSent: boolean;
  }) {
    return prisma.processingHistory.create({
      data: {
        id: params.id,
        userName: params.userName,
        userEmail: params.userEmail,
        meetingTitle: params.meetingTitle,
        projectName: params.projectName,
        transcriptText: params.transcriptText,
        overallSummary: params.insights.overallSummary,
        managerSummary: params.insights.managerSummary,
        structuredJson: JSON.stringify(params.insights),
        generatedExcelPath: params.generatedExcelPath,
        generatedPdfPath: params.generatedPdfPath,
        emailSent: params.emailSent
      }
    });
  }

  public async listHistory() {
    return prisma.processingHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });
  }

  public async getRecord(historyId: string) {
    return prisma.processingHistory.findUnique({
      where: { id: historyId }
    });
  }

  public async markEmailSent(historyId: string, emailSent: boolean) {
    return prisma.processingHistory.update({
      where: { id: historyId },
      data: { emailSent }
    });
  }
}

