import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import { HistoryService } from "../services/history.service";
import { HttpError } from "../utils/http-error";

export class MeetingHistoryController {
  private readonly historyService = new HistoryService();

  private getHistoryId(raw: string | string[] | undefined) {
    if (typeof raw !== "string" || raw.trim().length === 0) {
      throw new HttpError(400, "Meeting history id is required.");
    }

    return raw;
  }

  public async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new HttpError(401, "Authentication required.");
      }

      const items = await this.historyService.listHistory(req.userId);
      res.json({
        success: true,
        data: items.map((item) => this.historyService.toSummary(item))
      });
    } catch (error) {
      next(error);
    }
  }

  public async detail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new HttpError(401, "Authentication required.");
      }

      const item = await this.historyService.getRecordForUser(this.getHistoryId(req.params.id), req.userId);
      if (!item) {
        throw new HttpError(404, "Meeting history item not found.");
      }

      res.json({
        success: true,
        data: this.historyService.toSummary(item)
      });
    } catch (error) {
      next(error);
    }
  }

  public async downloadExcel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new HttpError(401, "Authentication required.");
      }

      const item = await this.historyService.getRecordForUser(this.getHistoryId(req.params.id), req.userId);
      if (!item || !item.generatedExcelUrl) {
        throw new HttpError(404, "Excel download is not available.");
      }

      res.redirect(item.generatedExcelUrl);
    } catch (error) {
      next(error);
    }
  }

  public async downloadPdf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new HttpError(401, "Authentication required.");
      }

      const item = await this.historyService.getRecordForUser(this.getHistoryId(req.params.id), req.userId);
      if (!item || !item.generatedPdfUrl) {
        throw new HttpError(404, "PDF download is not available.");
      }

      res.redirect(item.generatedPdfUrl);
    } catch (error) {
      next(error);
    }
  }
}
