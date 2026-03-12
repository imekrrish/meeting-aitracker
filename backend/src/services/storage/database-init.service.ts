import { prisma } from "./prisma.service";

export class DatabaseInitService {
  public async ensureSchema() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProcessingHistory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userName" TEXT NOT NULL,
        "userEmail" TEXT NOT NULL,
        "meetingTitle" TEXT NOT NULL,
        "projectName" TEXT,
        "transcriptText" TEXT NOT NULL,
        "overallSummary" TEXT NOT NULL,
        "managerSummary" TEXT,
        "structuredJson" TEXT NOT NULL,
        "generatedExcelPath" TEXT NOT NULL,
        "generatedPdfPath" TEXT NOT NULL,
        "emailSent" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

