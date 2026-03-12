import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { MeetingInsight } from "../types/meeting-insight";

export class PdfService {
  public async generatePdf(params: {
    outputDir: string;
    meetingTitle: string;
    projectName: string | null;
    userName: string;
    insights: MeetingInsight;
  }): Promise<string> {
    const document = await PDFDocument.create();
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    const pageSize: [number, number] = [595, 842];
    const margin = 42;
    const usableWidth = pageSize[0] - margin * 2;

    let page = document.addPage(pageSize);
    let cursorY = page.getHeight() - margin;

    const newPage = () => {
      page = document.addPage(pageSize);
      cursorY = page.getHeight() - margin;
    };

    const writeLine = (line: string, size: number, font: PDFFont, color = rgb(0.16, 0.19, 0.26)) => {
      if (cursorY < 60) {
        newPage();
      }

      page.drawText(line, {
        x: margin,
        y: cursorY,
        size,
        font,
        color
      });
      cursorY -= size + 5;
    };

    const writeBlock = (text: string, size: number, isBold = false, color?: ReturnType<typeof rgb>) => {
      const activeFont = isBold ? bold : regular;
      const lines = this.wrapText(text, activeFont, size, usableWidth);
      lines.forEach((line) => writeLine(line, size, activeFont, color));
      cursorY -= 4;
    };

    const writeSection = (title: string, items: string[]) => {
      writeBlock(title, 14, true, rgb(0.05, 0.22, 0.48));
      if (!items.length) {
        writeBlock("No items identified.", 10);
        return;
      }

      items.forEach((item) => writeBlock(`- ${item}`, 10));
    };

    writeBlock(params.insights.meetingTitleSuggestion ?? params.meetingTitle, 22, true, rgb(0.04, 0.2, 0.42));
    writeBlock(`Generated for ${params.userName} on ${new Date().toLocaleString()}`, 10);
    if (params.projectName) {
      writeBlock(`Project / Module: ${params.projectName}`, 10);
    }

    writeSection("Overall Summary", [params.insights.overallSummary]);
    writeSection("Manager Summary", [params.insights.managerSummary ?? "N/A"]);
    writeSection("Executive Summary", [params.insights.executiveSummary ?? "N/A"]);
    writeSection("Key Decisions", params.insights.keyDecisions);
    writeSection(
      "Action Items",
      params.insights.rows.map(
        (row) => `${row.owner ?? row.speaker ?? "Unassigned"}: ${row.actionItem ?? "N/A"} (${row.status ?? "unknown"})`
      )
    );
    writeSection("Blockers", params.insights.blockers);
    writeSection("Risks", params.insights.risks);
    writeSection(
      "Owner-wise Tasks",
      params.insights.ownerWiseActionTracker.map(
        (entry) => `${entry.owner ?? "Unassigned"}: ${entry.items.join("; ") || "N/A"}`
      )
    );
    writeSection("Next Steps", params.insights.followUpQuestions);
    writeSection("Suggested Next Meeting Agenda", params.insights.suggestedNextMeetingAgenda);
    writeSection("Follow-up Email Draft", [params.insights.followUpEmailDraft ?? "N/A"]);

    const pdfBytes = await document.save();
    const outputPath = path.join(params.outputDir, "meeting-summary.pdf");
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }

  private wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        currentLine = candidate;
        return;
      }

      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length ? lines : [text];
  }
}

