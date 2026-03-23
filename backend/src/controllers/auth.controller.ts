import type { NextFunction, Request, Response } from "express";
import { microsoftAuthService } from "../services/singletons";
import { HttpError } from "../utils/http-error";
import { loginSchema, registerSchema, resendOtpSchema, verifyOtpSchema } from "../validators/auth.validator";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";

export class AuthController {
  private async getAuthService() {
    const { AuthService } = await import("../services/auth.service");
    return new AuthService();
  }

  public async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const authService = await this.getAuthService();
      const result = await authService.register(validated);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = verifyOtpSchema.parse(req.body);
      const authService = await this.getAuthService();
      const result = await authService.verifyOtp(validated);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const authService = await this.getAuthService();
      const result = await authService.login(validated);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = resendOtpSchema.parse(req.body);
      const authService = await this.getAuthService();
      const result = await authService.resendOtp(validated);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  public async microsoftLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const mode = req.query.mode === "automation" ? "automation" : "basic";
      const { sessionId, authorizationUrl } = await microsoftAuthService.beginLogin(
        microsoftAuthService.getSessionIdFromRequest(req),
        mode
      );
      res.cookie(
        microsoftAuthService.sessionCookieName,
        sessionId,
        microsoftAuthService.getCookieOptions()
      );
      res.redirect(authorizationUrl);
    } catch (error) {
      next(error);
    }
  }

  public async microsoftCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const code = typeof req.query.code === "string" ? req.query.code : undefined;
      const state = typeof req.query.state === "string" ? req.query.state : undefined;
      const providerError = typeof req.query.error === "string" ? req.query.error : undefined;
      const providerErrorDescription =
        typeof req.query.error_description === "string" ? req.query.error_description : undefined;

      if (providerError) {
        throw new HttpError(
          400,
          providerErrorDescription
            ? `Microsoft login failed: ${providerErrorDescription}`
            : `Microsoft login failed: ${providerError}`
        );
      }

      if (!code || !state) {
        throw new HttpError(400, "Missing Microsoft callback parameters.");
      }

      const sessionId = microsoftAuthService.getSessionIdFromRequest(req);
      if (!sessionId) {
        throw new HttpError(400, "Microsoft OAuth session was not found. Please try again.");
      }

      const authPayload = await microsoftAuthService.handleCallback({
        sessionId,
        state,
        code
      });

      res.cookie(
        microsoftAuthService.sessionCookieName,
        sessionId,
        microsoftAuthService.getCookieOptions()
      );

      const redirectUrl = new URL("/dashboard", process.env.FRONTEND_URL || "http://localhost:5173");
      redirectUrl.searchParams.set("connected", "true");
      redirectUrl.searchParams.set("authToken", authPayload.token);
      redirectUrl.searchParams.set("email", authPayload.user.email);
      redirectUrl.searchParams.set("mode", req.query.mode === "automation" ? "automation" : "basic");
      res.redirect(redirectUrl.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Microsoft OAuth callback failed.";
      console.error("[Microsoft OAuth] Callback failed:", message);
      if (res.headersSent) {
        return next(error);
      }

      const redirectUrl = new URL("/dashboard", process.env.FRONTEND_URL || "http://localhost:5173");
      redirectUrl.searchParams.set("connected", "false");
      redirectUrl.searchParams.set("error", message);
      res.redirect(redirectUrl.toString());
    }
  }

  public async session(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new HttpError(401, "Authentication required.");
      }

      const session = await microsoftAuthService.getSession(req.userId);
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      next(error);
    }
  }

  public async logout(_req: Request, res: Response) {
    res.json({
      success: true,
      data: {
        loggedOut: true
      }
    });
  }
}
