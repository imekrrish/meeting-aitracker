import type { HistoryItem, ProcessResponse } from "../types/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Request failed.");
  }
  return data.data;
}

export async function processTranscript(formData: FormData) {
  const response = await fetch(`${API_URL}/api/transcripts/process`, {
    method: "POST",
    body: formData
  });

  return parseJson<ProcessResponse>(response);
}

export async function getHistory() {
  const response = await fetch(`${API_URL}/api/history`);
  return parseJson<HistoryItem[]>(response);
}

export function toAbsoluteUrl(url: string) {
  if (url.startsWith("http")) {
    return url;
  }

  return `${API_URL}${url}`;
}

