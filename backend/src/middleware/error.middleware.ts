import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { HttpError } from "../utils/http-error";

export function errorMiddleware(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message
    });
  }

  return res.status(500).json({
    success: false,
    error: error.message || "Internal server error"
  });
}

