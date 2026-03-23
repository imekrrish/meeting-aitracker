import axios from "axios";
import type {
  AuthSession,
  HistoryItem,
  MicrosoftIntegrationStatus,
  ProcessResponse
} from "../types/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
};

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

function getAuthHeaders(): Record<string, string> | undefined {
  const token = localStorage.getItem("auth_token");
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return undefined;
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>) {
  if (!payload.success) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload.data;
}

function toRequestError(error: unknown) {
  if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) {
    return new Error(error.response?.data?.error || error.message || "Request failed.");
  }

  return error instanceof Error ? error : new Error("Request failed.");
}

export async function processTranscript(formData: FormData) {
  try {
    const response = await apiClient.post<ApiEnvelope<ProcessResponse>>("/api/transcripts/process", formData, {
      headers: getAuthHeaders()
    });

    return unwrapEnvelope(response.data);
  } catch (error) {
    throw toRequestError(error);
  }
}

export async function getHistory() {
  try {
    const response = await apiClient.get<ApiEnvelope<HistoryItem[]>>("/api/meetings/history", {
      headers: getAuthHeaders()
    });
    return unwrapEnvelope(response.data);
  } catch (error) {
    throw toRequestError(error);
  }
}

export async function postJson<T>(url: string, body: unknown) {
  try {
    const response = await apiClient.post<ApiEnvelope<T>>(url, body, {
      headers: {
        "Content-Type": "application/json",
        ...(getAuthHeaders() ?? {})
      }
    });

    return unwrapEnvelope(response.data);
  } catch (error) {
    throw toRequestError(error);
  }
}

export async function patchJson<T>(url: string, body: unknown) {
  try {
    const response = await apiClient.patch<ApiEnvelope<T>>(url, body, {
      headers: {
        "Content-Type": "application/json",
        ...(getAuthHeaders() ?? {})
      }
    });

    return unwrapEnvelope(response.data);
  } catch (error) {
    throw toRequestError(error);
  }
}

export async function getAuthSession() {
  try {
    const response = await apiClient.get<ApiEnvelope<AuthSession>>("/api/auth/session", {
      headers: getAuthHeaders()
    });

    return unwrapEnvelope(response.data);
  } catch (error) {
    throw toRequestError(error);
  }
}

export async function logoutSession() {
  try {
    const response = await apiClient.post<ApiEnvelope<{ loggedOut: boolean }>>("/api/auth/logout", undefined, {
      headers: getAuthHeaders()
    });

    return unwrapEnvelope(response.data);
  } catch (error) {
    throw toRequestError(error);
  }
}

export async function getMicrosoftIntegrationStatus() {
  try {
    const response = await apiClient.get<ApiEnvelope<MicrosoftIntegrationStatus>>(
      "/api/integrations/microsoft/status",
      {
        headers: getAuthHeaders()
      }
    );

    return unwrapEnvelope(response.data);
  } catch (error) {
    throw toRequestError(error);
  }
}

export async function updateMicrosoftIntegrationSettings(payload: {
  automationEnabled?: boolean;
  processingMode?: "tagged_meetings_only" | "organizer_only";
}) {
  return patchJson<MicrosoftIntegrationStatus>("/api/integrations/microsoft/settings", payload);
}

export function toAbsoluteUrl(url: string) {
  if (url.startsWith("http")) {
    return url;
  }

  return `${API_URL}${url}`;
}
