import { useEffect, useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { ProcessingStatus } from "./components/ProcessingStatus";
import { ResultsSection } from "./components/ResultsSection";
import { TranscriptForm } from "./components/TranscriptForm";
import {
  getAuthSession,
  getHistory,
  getMicrosoftIntegrationStatus,
  logoutSession,
  processTranscript,
  updateMicrosoftIntegrationSettings
} from "./lib/api";
import type { AuthSession, HistoryItem, MicrosoftIntegrationStatus, ProcessResponse } from "./types/api";

type AuthUser = AuthSession["user"];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [integration, setIntegration] = useState<MicrosoftIntegrationStatus | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [connectedBanner, setConnectedBanner] = useState<string | null>(null);
  const personalAccountAutomationBlocked = Boolean(
    integration?.lastSyncError?.includes("Personal Microsoft accounts are not supported")
  );
  const automationConsentMissing = Boolean(
    integration?.lastSyncError?.includes("Automation consent not granted yet")
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get("authToken");
    const connected = params.get("connected");
    const mode = params.get("mode");
    const oauthError = params.get("error");

    if (authToken) {
      localStorage.setItem("auth_token", authToken);
      setToken(authToken);
    }

    if (connected === "true") {
      setConnectedBanner(
        mode === "automation"
          ? "Microsoft account connected and automation consent flow completed."
          : "Microsoft account connected successfully."
      );
    }

    if (oauthError) {
      setDashboardError(oauthError);
    }

    if (authToken || connected || oauthError) {
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    void loadDashboard();
  }, [token]);

  const loadDashboard = async () => {
    setIsBootstrapping(true);

    try {
      // Session is required — if this fails, token is invalid
      const session = await getAuthSession();
      localStorage.setItem("auth_user", JSON.stringify(session.user));
      setUser(session.user);

      // Microsoft integration and history are optional — don't block the dashboard
      const [microsoftStatus, items] = await Promise.allSettled([
        getMicrosoftIntegrationStatus(),
        getHistory()
      ]);

      if (microsoftStatus.status === "fulfilled") {
        setIntegration(microsoftStatus.value);
      }

      if (items.status === "fulfilled") {
        setHistory(items.value);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard.";
      setDashboardError(message);
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      setToken(null);
      setUser(null);
      setIntegration(null);
      setHistory([]);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const handleAuthSuccess = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = async () => {
    try {
      await logoutSession();
    } catch {
      // Best-effort logout for stateless JWT auth.
    }

    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
    setIntegration(null);
    setHistory([]);
    setResult(null);
    setDashboardError(null);
    setConnectedBanner(null);
    window.history.replaceState({}, "", "/");
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setDashboardError(null);

    try {
      const response = await processTranscript(formData);
      setResult(response);
      const items = await getHistory();
      setHistory(items);
    } catch (requestError) {
      setDashboardError(requestError instanceof Error ? requestError.message : "Processing failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingChange = async (key: "automationEnabled" | "processingMode", value: boolean | string) => {
    if (!integration) {
      return;
    }

    const optimistic = {
      ...integration,
      [key]: value
    } as MicrosoftIntegrationStatus;

    setIntegration(optimistic);
    setIsSavingSettings(true);
    setDashboardError(null);

    try {
      const updated = await updateMicrosoftIntegrationSettings({
        automationEnabled:
          key === "automationEnabled" ? (value as boolean) : integration.automationEnabled,
        processingMode:
          key === "processingMode"
            ? (value as "tagged_meetings_only" | "organizer_only")
            : integration.processingMode
      });

      setIntegration(updated);
    } catch (error) {
      setIntegration(integration);
      setDashboardError(error instanceof Error ? error.message : "Failed to update settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleEnableAutomation = () => {
    window.location.href = `${API_URL}/auth/microsoft/login?mode=automation`;
  };

  if (!token || !user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-hero-grid">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="glass-panel overflow-hidden p-8 md:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-tide">
                Meeting Tracker AI
              </p>
              <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-tight text-ink md:text-6xl">
                AI-powered meeting transcript processing dashboard.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 md:text-lg">
                Upload your meeting transcripts to get AI-generated summaries, Excel reports, and PDF artifacts.
                Optionally connect Microsoft for Teams automation.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/90 px-4 py-2 text-sm text-slate-700">
                {user.name} · {user.email}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="mt-10 space-y-8">
          {connectedBanner ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
              {connectedBanner}
            </div>
          ) : null}

          {dashboardError ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {dashboardError}
            </div>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="glass-panel p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-tide">Integration Status</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                    integration?.connected
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {integration?.connected ? "Microsoft connected" : "Not connected"}
                </span>
                {integration?.connected ? (
                  <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {integration.processingMode === "tagged_meetings_only"
                      ? "Tagged meetings only"
                      : "Organizer only"}
                  </span>
                ) : null}
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-700">
                <p>Connected email: {integration?.email ?? "Not connected yet"}</p>
                <p>Automation enabled: {integration?.automationEnabled ? "Yes" : "No"}</p>
                <p>
                  Subscription expiry:{" "}
                  {integration?.subscriptionExpiresAt
                    ? new Date(integration.subscriptionExpiresAt).toLocaleString()
                    : "Not registered"}
                </p>
                {integration?.lastSyncError ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                    {integration.lastSyncError}
                  </p>
                ) : null}
                {personalAccountAutomationBlocked ? (
                  <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
                    Automation requires a Microsoft 365 work or school account. You can stay connected and
                    keep using manual transcript upload with this personal account.
                  </p>
                ) : null}
                {!integration?.connected ? (
                  <a
                    href={`${API_URL}/auth/microsoft/login`}
                    className="inline-flex rounded-full bg-[#0f5ea8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b4d8b]"
                  >
                    Connect Microsoft
                  </a>
                ) : integration && !personalAccountAutomationBlocked ? (
                  <button
                    type="button"
                    onClick={handleEnableAutomation}
                    className="inline-flex rounded-full bg-[#0f5ea8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b4d8b]"
                  >
                    Enable Teams Automation
                  </button>
                ) : null}
              </div>
            </div>

            <div className="glass-panel p-6">
              <p className="text-xs uppercase tracking-[0.22em] text-tide">Automation Settings</p>
              <div className="mt-5 space-y-4 text-sm text-slate-700">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span className="font-medium text-ink">Automation enabled</span>
                  <input
                    type="checkbox"
                    checked={Boolean(integration?.automationEnabled)}
                    disabled={!integration?.connected || isSavingSettings}
                    onChange={(event) => handleSettingChange("automationEnabled", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#0f5ea8]"
                  />
                </label>

                <label className="block rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span className="font-medium text-ink">Processing mode</span>
                  <select
                    value={integration?.processingMode ?? "tagged_meetings_only"}
                    disabled={!integration?.connected || isSavingSettings}
                    onChange={(event) => handleSettingChange("processingMode", event.target.value)}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none transition focus:border-tide"
                  >
                    <option value="tagged_meetings_only">Tagged meetings only</option>
                    <option value="organizer_only">Organizer only</option>
                  </select>
                </label>

                <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800">
                  Safe default: only meetings organized by you, only when a transcript exists, and by
                  default only if the title contains <strong>[TRACK]</strong>.
                </p>
                {personalAccountAutomationBlocked ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                    Automation settings are visible here, but Teams transcript subscriptions will stay disabled
                    until you connect with a work or school Microsoft account.
                  </p>
                ) : null}
                {automationConsentMissing ? (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                    Basic sign-in is active. Use <strong>Enable Teams Automation</strong> to request the extra
                    Microsoft Graph permissions only when you are ready.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <div className="mb-5">
              <p className="section-title">Recent Meeting Summaries</p>
              <p className="mt-2 text-sm text-slate-600">
                Manual and Microsoft Teams transcript runs are listed together.
              </p>
            </div>

            <div className="glass-panel p-6">
              {isBootstrapping ? (
                <p className="text-sm text-slate-500">Loading dashboard...</p>
              ) : history.length ? (
                <div className="space-y-4">
                  {history.map((item) => (
                    <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-2xl font-bold text-ink">
                              {item.meetingTitle || "Meeting Summary"}
                            </p>
                            <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-tide">
                              {item.sourceType === "microsoft_teams" ? "Microsoft Teams" : "Manual Upload"}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                                item.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : item.status === "failed"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            Generated {new Date(item.createdAt).toLocaleString()}
                            {item.meetingStartTime ? ` · Meeting started ${new Date(item.meetingStartTime).toLocaleString()}` : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {item.generatedExcelUrl ? (
                            <a
                              href={item.generatedExcelUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-[#0f5ea8] hover:text-[#0f5ea8]"
                            >
                              Download Excel
                            </a>
                          ) : null}
                          {item.generatedPdfUrl ? (
                            <a
                              href={item.generatedPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-[#0f5ea8] hover:text-[#0f5ea8]"
                            >
                              Download PDF
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-slate-700">{item.summaryPreview}</p>

                      {item.emailError ? (
                        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Email issue: {item.emailError}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-[24px] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  No processed meetings yet. Connect Microsoft or run a manual upload to populate the dashboard.
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="mb-5">
              <p className="section-title">Manual Upload</p>
              <p className="mt-2 text-sm text-slate-600">
                Upload a transcript to generate AI summaries, Excel, and PDF artifacts. Download the results instantly.
              </p>
            </div>

            <TranscriptForm onSubmit={handleSubmit} isLoading={isLoading} />
          </section>

          <ProcessingStatus isLoading={isLoading} />
          {result ? <ResultsSection result={result} /> : null}
        </main>
      </div>
    </div>
  );
}
