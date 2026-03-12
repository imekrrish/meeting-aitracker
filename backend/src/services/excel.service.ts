import ExcelJS from "exceljs";
import path from "path";
import type { MeetingInsight } from "../types/meeting-insight";

export class ExcelService {
  public async generateWorkbook(params: {
    outputDir: string;
    meetingTitle: string;
    projectName: string | null;
    userName: string;
    insights: MeetingInsight;
  }): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Meeting Tracker AI";
    workbook.created = new Date();

    this.buildSummarySheet(workbook, params);
    this.buildStructuredUpdatesSheet(workbook, params.insights);
    this.buildActionItemsSheet(workbook, params.insights);
    this.buildBlockersSheet(workbook, params.insights);
    this.buildOwnerViewSheet(workbook, params.insights);

    const outputPath = path.join(params.outputDir, "meeting-tracker.xlsx");
    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
  }

  private buildSummarySheet(
    workbook: ExcelJS.Workbook,
    params: {
      meetingTitle: string;
      projectName: string | null;
      userName: string;
      insights: MeetingInsight;
    }
  ) {
    const sheet = workbook.addWorksheet("Summary");
    sheet.columns = [
      { header: "Field", key: "field", width: 28 },
      { header: "Value", key: "value", width: 90 }
    ];

    sheet.addRows([
      { field: "Meeting Title", value: params.meetingTitle },
      { field: "Suggested Title", value: params.insights.meetingTitleSuggestion ?? "N/A" },
      { field: "Project", value: params.projectName ?? "N/A" },
      { field: "Requested By", value: params.userName },
      { field: "Overall Summary", value: params.insights.overallSummary },
      { field: "Manager Summary", value: params.insights.managerSummary ?? "N/A" },
      { field: "Executive Summary", value: params.insights.executiveSummary ?? "N/A" },
      { field: "Key Decisions", value: params.insights.keyDecisions.join("\n") || "N/A" },
      { field: "Risks", value: params.insights.risks.join("\n") || "N/A" },
      { field: "Next Meeting Agenda", value: params.insights.suggestedNextMeetingAgenda.join("\n") || "N/A" }
    ]);

    this.formatHeader(sheet);
    sheet.getColumn("value").alignment = { wrapText: true, vertical: "top" };
  }

  private buildStructuredUpdatesSheet(workbook: ExcelJS.Workbook, insights: MeetingInsight) {
    const sheet = workbook.addWorksheet("Structured Updates");
    sheet.columns = [
      { header: "Speaker", key: "speaker", width: 18 },
      { header: "Work Done", key: "workDone", width: 30 },
      { header: "Blocker", key: "blocker", width: 26 },
      { header: "Action Item", key: "actionItem", width: 30 },
      { header: "Owner", key: "owner", width: 18 },
      { header: "ETA", key: "eta", width: 16 },
      { header: "Priority", key: "priority", width: 14 },
      { header: "Status", key: "status", width: 16 },
      { header: "Notes", key: "notes", width: 28 },
      { header: "Confidence", key: "confidence", width: 12 }
    ];

    insights.rows.forEach((row) => {
      sheet.addRow(row);
    });

    this.formatHeader(sheet);
    sheet.eachRow((row, index) => {
      if (index > 1) {
        row.alignment = { vertical: "top", wrapText: true };
      }
    });
  }

  private buildActionItemsSheet(workbook: ExcelJS.Workbook, insights: MeetingInsight) {
    const sheet = workbook.addWorksheet("Action Items");
    sheet.columns = [
      { header: "Owner", key: "owner", width: 18 },
      { header: "Action Item", key: "actionItem", width: 38 },
      { header: "ETA", key: "eta", width: 16 },
      { header: "Priority", key: "priority", width: 14 },
      { header: "Status", key: "status", width: 16 },
      { header: "Confidence", key: "confidence", width: 12 }
    ];

    insights.rows
      .filter((row) => row.actionItem)
      .forEach((row) => {
        sheet.addRow({
          owner: row.owner ?? row.speaker ?? "Unassigned",
          actionItem: row.actionItem,
          eta: row.eta ?? "N/A",
          priority: row.priority ?? "N/A",
          status: row.status ?? "N/A",
          confidence: row.confidence
        });
      });

    this.formatHeader(sheet);
  }

  private buildBlockersSheet(workbook: ExcelJS.Workbook, insights: MeetingInsight) {
    const sheet = workbook.addWorksheet("Blockers");
    sheet.columns = [
      { header: "Blocker", key: "blocker", width: 42 },
      { header: "Owner", key: "owner", width: 20 },
      { header: "Severity", key: "severity", width: 14 }
    ];

    if (insights.blockerRadar.length) {
      insights.blockerRadar.forEach((item) => sheet.addRow(item));
    } else if (insights.blockers.length) {
      insights.blockers.forEach((item) =>
        sheet.addRow({ blocker: item, owner: "Unknown", severity: "N/A" })
      );
    } else {
      sheet.addRow({ blocker: "No blockers identified", owner: "N/A", severity: "N/A" });
    }

    this.formatHeader(sheet);
  }

  private buildOwnerViewSheet(workbook: ExcelJS.Workbook, insights: MeetingInsight) {
    const sheet = workbook.addWorksheet("Owner View");
    sheet.columns = [
      { header: "Owner", key: "owner", width: 18 },
      { header: "Items", key: "items", width: 46 }
    ];

    insights.ownerWiseActionTracker.forEach((entry) => {
      sheet.addRow({
        owner: entry.owner ?? "Unassigned",
        items: entry.items.join("\n")
      });
    });

    this.formatHeader(sheet);
    sheet.getColumn("items").alignment = { wrapText: true, vertical: "top" };
  }

  private formatHeader(sheet: ExcelJS.Worksheet) {
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4B99" }
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }
}

