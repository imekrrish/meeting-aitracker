import nodemailer from "nodemailer";
import { env } from "../config/env";

export class EmailService {
  private readonly transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  public async sendMeetingResults(params: {
    to: string;
    userName: string;
    meetingTitle: string;
    overallSummary: string;
    pdfPath?: string | null;
    excelPath: string;
    pdfUrl?: string;
    excelUrl?: string;
  }) {
    const attachments = [
      params.pdfPath
        ? {
            filename: "meeting-summary.pdf",
            path: params.pdfPath
          }
        : null,
      {
        filename: "meeting-tracker.xlsx",
        path: params.excelPath
      }
    ].filter(Boolean) as Array<{ filename: string; path: string }>;

    await this.transporter.sendMail({
      from: env.MAIL_FROM,
      to: params.to,
      subject: `Meeting Tracker AI: ${params.meetingTitle}`,
      html: this.buildHtmlTemplate(params),
      attachments
    });
  }

  private buildHtmlTemplate(params: {
    userName: string;
    meetingTitle: string;
    overallSummary: string;
    pdfPath?: string | null;
    pdfUrl?: string;
    excelUrl?: string;
  }) {
    return `
      <div style="font-family: Arial, sans-serif; background: #f6f8fc; padding: 24px; color: #162033;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; border: 1px solid #dbe3f4;">
          <p style="margin: 0 0 12px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #4f6ea8;">Meeting Tracker AI</p>
          <h1 style="margin: 0 0 12px; font-size: 28px; color: #102445;">${params.meetingTitle}</h1>
          <p style="margin: 0 0 18px; font-size: 15px; color: #46536c;">Hi ${params.userName}, your meeting outputs are attached and ready to download.</p>
          <div style="background: #f1f5ff; border-radius: 14px; padding: 18px; margin-bottom: 18px;">
            <p style="margin: 0 0 8px; font-weight: 700; color: #173670;">Overall summary</p>
            <p style="margin: 0; line-height: 1.7; color: #23324e;">${params.overallSummary}</p>
          </div>
          <p style="margin: 0; font-size: 14px; color: #5b6983;">Attachments included: <strong>meeting-tracker.xlsx</strong>${params.pdfUrl || params.pdfPath ? " and <strong>meeting-summary.pdf</strong>" : ""}.</p>
          ${params.pdfUrl || params.excelUrl
        ? `<div style="margin-top: 18px; font-size: 14px; color: #23324e;">
                <p style="margin: 0 0 8px; font-weight: 700;">Cloud downloads</p>
                ${params.pdfUrl ? `<p style="margin: 0 0 4px;"><a href="${params.pdfUrl}">Download PDF</a></p>` : ""}
                ${params.excelUrl ? `<p style="margin: 0;"><a href="${params.excelUrl}">Download Excel</a></p>` : ""}
             </div>`
        : ""}
          <p style="margin: 18px 0 0; font-size: 13px; color: #76829a;">Use a Gmail App Password for SMTP. Standard account passwords are not supported.</p>
        </div>
      </div>
    `;
  }
}

