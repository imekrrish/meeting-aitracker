import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import type { CookieOptions, Request } from "express";
import { prisma } from "./storage/prisma.service";
import { MicrosoftGraphService } from "./microsoftGraph.service";
import { AuthService } from "./auth.service";
import { TranscriptSubscriptionService } from "./transcriptSubscription.service";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

type OAuthStateRecord = {
  pendingState: string;
  mode: "basic" | "automation";
};

export class MicrosoftAuthService {
  public readonly sessionCookieName = "ms_oauth_session";
  private readonly statesFilePath = path.resolve(env.generatedDir, "microsoft-oauth-states.json");
  private readonly graphService = new MicrosoftGraphService();
  private readonly authService = new AuthService();
  private readonly transcriptSubscriptionService = new TranscriptSubscriptionService();
  private readonly states = new Map<string, OAuthStateRecord>();
  private statesLoaded = false;

  public getSessionIdFromRequest(req: Request) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return undefined;
    }

    const cookies = cookieHeader.split(";").map((item) => item.trim());
    const sessionCookie = cookies.find((item) => item.startsWith(`${this.sessionCookieName}=`));
    if (!sessionCookie) {
      return undefined;
    }

    return decodeURIComponent(sessionCookie.slice(this.sessionCookieName.length + 1));
  }

  public getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24
    };
  }

  public async beginLogin(existingSessionId?: string, mode: "basic" | "automation" = "basic") {
    await this.loadStates();
    const sessionId = existingSessionId ?? randomBytes(24).toString("hex");
    const state = randomBytes(16).toString("hex");

    this.states.set(sessionId, { pendingState: state, mode });
    await this.persistStates();

    const scopes = mode === "automation" ? env.MICROSOFT_AUTOMATION_SCOPES : env.MICROSOFT_LOGIN_SCOPES;

    return {
      sessionId,
      authorizationUrl: this.graphService.buildAuthorizationUrl(state, scopes)
    };
  }

  public async handleCallback(params: {
    sessionId: string;
    state: string;
    code: string;
  }) {
    await this.loadStates();
    const record = this.states.get(params.sessionId);
    if (!record || record.pendingState !== params.state) {
      throw new HttpError(400, "Invalid Microsoft OAuth state. Please restart the login flow.");
    }

    const tokenResponse = await this.graphService.exchangeCodeForToken(params.code);
    const profile = await this.graphService.getProfile(tokenResponse.access_token);
    const claims = this.graphService.decodeJwtClaims(tokenResponse.access_token);
    const tenantId = typeof claims.tid === "string" ? claims.tid : env.TENANT_ID ?? "common";

    const existingUser = await prisma.user.findUnique({
      where: { email: profile.email },
      include: { microsoftIntegration: true }
    });

    const user = existingUser
      ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: profile.displayName,
          email: profile.email,
          isVerified: true
        }
      })
      : await prisma.user.create({
        data: {
          name: profile.displayName,
          email: profile.email,
          passwordHash: null,
          isVerified: true
        }
      });

    const existingIntegration = await prisma.microsoftIntegration.findUnique({
      where: { userId: user.id }
    });

    const integration = await prisma.microsoftIntegration.upsert({
      where: { userId: user.id },
      update: {
        microsoftUserId: profile.microsoftUserId,
        tenantId,
        email: profile.email,
        displayName: profile.displayName,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? existingIntegration?.refreshToken ?? null,
        grantedScopes: tokenResponse.scope ?? existingIntegration?.grantedScopes ?? null,
        tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        automationEnabled: existingIntegration?.automationEnabled ?? true,
        processingMode: existingIntegration?.processingMode ?? "tagged_meetings_only",
        lastSyncError: null
      },
      create: {
        userId: user.id,
        microsoftUserId: profile.microsoftUserId,
        tenantId,
        email: profile.email,
        displayName: profile.displayName,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? null,
        grantedScopes: tokenResponse.scope ?? null,
        tokenExpiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000),
        automationEnabled: true,
        processingMode: "tagged_meetings_only"
      }
    });

    if (record.mode === "automation") {
      try {
        await this.transcriptSubscriptionService.ensureSubscriptionForIntegration(integration.id);
      } catch (error) {
        await prisma.microsoftIntegration.update({
          where: { id: integration.id },
          data: {
            lastSyncError: error instanceof Error ? error.message : "Subscription setup failed."
          }
        });
      }
    }

    this.states.delete(params.sessionId);
    await this.persistStates();

    return {
      ...this.authService.buildAuthPayload(user),
      integrationId: integration.id
    };
  }

  public async getSession(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { microsoftIntegration: true }
    });

    if (!user) {
      throw new HttpError(404, "Authenticated user not found.");
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      microsoftIntegration: user.microsoftIntegration
        ? {
          id: user.microsoftIntegration.id,
          email: user.microsoftIntegration.email,
          displayName: user.microsoftIntegration.displayName,
          automationEnabled: user.microsoftIntegration.automationEnabled,
          processingMode: user.microsoftIntegration.processingMode,
          grantedScopes: user.microsoftIntegration.grantedScopes,
          subscriptionId: user.microsoftIntegration.subscriptionId,
          subscriptionExpiresAt: user.microsoftIntegration.subscriptionExpiresAt,
          lastSyncError: user.microsoftIntegration.lastSyncError
        }
        : null
    };
  }

  private async loadStates() {
    if (this.statesLoaded) {
      return;
    }

    try {
      const raw = await fs.readFile(this.statesFilePath, "utf8");
      const parsed = JSON.parse(raw) as Record<string, OAuthStateRecord>;
      for (const [sessionId, record] of Object.entries(parsed)) {
        this.states.set(sessionId, record);
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }

    this.statesLoaded = true;
  }

  private async persistStates() {
    await fs.mkdir(path.dirname(this.statesFilePath), { recursive: true });
    await fs.writeFile(this.statesFilePath, JSON.stringify(Object.fromEntries(this.states), null, 2), "utf8");
  }
}
