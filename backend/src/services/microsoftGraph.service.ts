import axios from "axios";
import { env } from "../config/env";
import { HttpError } from "../utils/http-error";

type MicrosoftTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

type MicrosoftProfileResponse = {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
};

type MicrosoftSubscriptionResponse = {
  id: string;
  resource: string;
  expirationDateTime: string;
  clientState?: string;
};

export class MicrosoftGraphService {
  private readonly baseUrl = "https://graph.microsoft.com/v1.0";

  public buildAuthorizationUrl(state: string, scopes: string) {
    this.assertConfigured();

    const authorizationUrl = new URL(
      `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/authorize`
    );

    authorizationUrl.searchParams.set("client_id", env.CLIENT_ID!);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("redirect_uri", env.REDIRECT_URI);
    authorizationUrl.searchParams.set("response_mode", "query");
    authorizationUrl.searchParams.set("scope", scopes);
    authorizationUrl.searchParams.set("state", state);

    return authorizationUrl.toString();
  }

  public async exchangeCodeForToken(code: string) {
    this.assertConfigured();

    const body = new URLSearchParams({
      client_id: env.CLIENT_ID!,
      client_secret: env.CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.REDIRECT_URI,
      scope: `${env.MICROSOFT_LOGIN_SCOPES} ${env.MICROSOFT_AUTOMATION_SCOPES}`.trim()
    });

    try {
      const response = await axios.post<MicrosoftTokenResponse>(
        `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`,
        body.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }
      );

      return response.data;
    } catch (error) {
      this.handleMicrosoftError("Token exchange failed.", error);
    }
  }

  public async refreshAccessToken(refreshToken: string) {
    this.assertConfigured();

    const body = new URLSearchParams({
      client_id: env.CLIENT_ID!,
      client_secret: env.CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: env.MICROSOFT_LOGIN_SCOPES
    });

    try {
      const response = await axios.post<MicrosoftTokenResponse>(
        `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`,
        body.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }
      );

      return response.data;
    } catch (error) {
      this.handleMicrosoftError("Refresh token exchange failed.", error);
    }
  }

  public async getProfile(accessToken: string) {
    try {
      const response = await axios.get<MicrosoftProfileResponse>(`${this.baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return {
        microsoftUserId: response.data.id,
        email: response.data.mail ?? response.data.userPrincipalName,
        displayName: response.data.displayName
      };
    } catch (error) {
      this.handleMicrosoftError("Fetching Microsoft profile failed.", error);
    }
  }

  public async createTranscriptSubscription(params: {
    accessToken: string;
    microsoftUserId: string;
    notificationUrl: string;
    lifecycleNotificationUrl: string;
    clientState: string;
  }) {
    const expirationDateTime = new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString();
    try {
      const response = await axios.post<MicrosoftSubscriptionResponse>(
        `${this.baseUrl}/subscriptions`,
        {
          changeType: "created",
          notificationUrl: params.notificationUrl,
          lifecycleNotificationUrl: params.lifecycleNotificationUrl,
          resource: `users/${params.microsoftUserId}/onlineMeetings/getAllTranscripts`,
          expirationDateTime,
          clientState: params.clientState
        },
        {
          headers: {
            Authorization: `Bearer ${params.accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      this.handleMicrosoftError("Creating transcript subscription failed.", error);
    }
  }

  public async renewTranscriptSubscription(params: {
    accessToken: string;
    subscriptionId: string;
  }) {
    const expirationDateTime = new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString();
    try {
      const response = await axios.patch<MicrosoftSubscriptionResponse>(
        `${this.baseUrl}/subscriptions/${params.subscriptionId}`,
        {
          expirationDateTime
        },
        {
          headers: {
            Authorization: `Bearer ${params.accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      this.handleMicrosoftError("Renewing transcript subscription failed.", error);
    }
  }

  public async getOnlineMeeting(params: {
    accessToken: string;
    microsoftUserId: string;
    meetingId: string;
  }) {
    try {
      const response = await axios.get<{
        id: string;
        subject?: string | null;
        startDateTime?: string | null;
        endDateTime?: string | null;
        organizer?: {
          identity?: {
            user?: {
              id?: string | null;
            };
          };
        };
      }>(
        `${this.baseUrl}/users/${encodeURIComponent(params.microsoftUserId)}/onlineMeetings/${encodeURIComponent(
          params.meetingId
        )}`,
        {
          headers: {
            Authorization: `Bearer ${params.accessToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      this.handleMicrosoftError("Fetching Microsoft online meeting failed.", error);
    }
  }

  public async getTranscriptText(params: {
    accessToken: string;
    microsoftUserId: string;
    meetingId: string;
    transcriptId: string;
  }) {
    try {
      const response = await axios.get<string>(
        `${this.baseUrl}/users/${encodeURIComponent(params.microsoftUserId)}/onlineMeetings/${encodeURIComponent(
          params.meetingId
        )}/transcripts/${encodeURIComponent(params.transcriptId)}/content?$format=text/vtt`,
        {
          headers: {
            Authorization: `Bearer ${params.accessToken}`
          },
          responseType: "text"
        }
      );

      return this.extractTextFromVtt(response.data);
    } catch (error) {
      this.handleMicrosoftError("Fetching Microsoft transcript content failed.", error);
    }
  }

  public decodeJwtClaims(token: string): Record<string, unknown> {
    const [, payload] = token.split(".");
    if (!payload) {
      return {};
    }

    try {
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const parsed = Buffer.from(normalized, "base64").toString("utf8");
      return JSON.parse(parsed) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private extractTextFromVtt(vtt: string) {
    return vtt
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => {
        if (!line) {
          return false;
        }

        if (line === "WEBVTT") {
          return false;
        }

        if (/^\d+$/.test(line)) {
          return false;
        }

        if (line.includes("-->")) {
          return false;
        }

        return true;
      })
      .join("\n");
  }

  private assertConfigured() {
    const missing = ["CLIENT_ID", "CLIENT_SECRET", "TENANT_ID"].filter((key) => {
      const value = env[key as "CLIENT_ID" | "CLIENT_SECRET" | "TENANT_ID"];
      return !value;
    });

    if (missing.length > 0) {
      throw new HttpError(500, `Missing Microsoft OAuth environment variables: ${missing.join(", ")}`);
    }
  }

  private handleMicrosoftError(message: string, error: unknown): never {
    if (axios.isAxiosError(error)) {
      console.error("[Microsoft Graph] Request failed.", {
        message,
        status: error.response?.status,
        data: error.response?.data
      });

      throw new HttpError(
        error.response?.status ?? 502,
        typeof error.response?.data === "object" && error.response?.data && "error" in error.response.data
          ? JSON.stringify(error.response.data)
          : error.message
      );
    }

    throw error instanceof Error ? error : new HttpError(500, message);
  }
}
