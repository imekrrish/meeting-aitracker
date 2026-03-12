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
    customColumns?: string[];
  }): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Meeting Tracker AI";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Meeting Summary");

    const defaultColumns = [
      "Speaker",
      "Task",
      "Work Done Today",
      "Task Progress",
      "Deadline",
      "Further Discussion"
    ];

    const columnsToUse = Array.isArray(params.customColumns) && params.customColumns.length > 0
      ? params.customColumns
      : defaultColumns;

    // Define columns
    sheet.columns = columnsToUse.map(col => ({
      header: col,
      key: col,
      width: 25 // Set a reasonable default width
    }));

    // Add rows
    params.insights.rows.forEach((row) => {
      const rowData: Record<string, any> = {};
      columnsToUse.forEach(col => {
        rowData[col] = row[col] ?? "N/A";
      });
      const addedRow = sheet.addRow(rowData);

      // Simple highlight for blockers or high priority if present in standard fields
      if (
        (row.blocker && row.blocker !== "N/A" && typeof row.blocker === 'string' && row.blocker.trim().length > 0) ||
        (row.priority && row.priority.toString().toLowerCase() === "high")
      ) {
        addedRow.font = { color: { argb: "FF990000" } }; // Dark red text for blockers/high priority
      }
    });

    this.formatHeader(sheet);
    sheet.eachRow((row, index) => {
      if (index > 1) {
        row.alignment = { vertical: "top", wrapText: true };
      }
    });

    const outputPath = path.join(params.outputDir, "meeting-tracker.xlsx");
    await workbook.xlsx.writeFile(outputPath);
    return outputPath;
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

