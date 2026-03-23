import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

export interface AuthenticatedRequest extends Request {
    userId?: string;
    userEmail?: string;
    userName?: string;
}

export function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new HttpError(401, "Authentication required. Please log in."));
    }

    if (!env.JWT_SECRET) {
        return next(new HttpError(500, "JWT_SECRET is not configured on the backend."));
    }

    const token = authHeader.slice(7);
    try {
        const payload = jwt.verify(token, env.JWT_SECRET) as unknown as {
            userId: string;
            email: string;
            name: string;
        };

        req.userId = payload.userId;
        req.userEmail = payload.email;
        req.userName = payload.name;
        next();
    } catch {
        next(new HttpError(401, "Invalid or expired token. Please log in again."));
    }
}
