import { useEffect, useState } from "react";
import { getHistory, processTranscript } from "./lib/api";
import { AuthPage } from "./components/AuthPage";
import { ProcessingStatus } from "./components/ProcessingStatus";
import { ResultsSection } from "./components/ResultsSection";
import { TranscriptForm } from "./components/TranscriptForm";
import type { HistoryItem, ProcessResponse } from "./types/api";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });

  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      void loadHistory();
    }
  }, [token]);

  const handleAuthSuccess = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
    setResult(null);
    setHistory([]);
  };

  const loadHistory = async () => {
    try {
      const items = await getHistory();
      setHistory(items);
    } catch {
      setHistory([]);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await processTranscript(formData);
      setResult(response);
      await loadHistory();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Processing failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show auth page if not logged in
  if (!token || !user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-hero-grid">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="glass-panel overflow-hidden p-8 md:p-10">
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-tide">
                Meeting Tracker AI
              </p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">
                  👋 {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-600"
                >
                  Sign Out
                </button>
              </div>
            </div>
            <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-tight text-ink md:text-6xl">
              Turn raw transcripts into deliverable-ready project outputs.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700 md:text-lg font-medium text-tide">
              Powered by AI
            </p>
          </div>
        </header>

        <main className="mt-10 space-y-8">
          <section>
            <div className="mb-5">
              <p className="section-title">Transcript Intake</p>
              <p className="mt-2 text-sm text-slate-600">
                Upload a transcript file or paste transcript text. Your email ({user.email}) will be used for delivery.
              </p>
            </div>
            <TranscriptForm onSubmit={handleSubmit} isLoading={isLoading} />
          </section>

          <ProcessingStatus isLoading={isLoading} />

          {error ? (
            <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {result ? <ResultsSection result={result} /> : null}

          <section className="grid gap-6">
            <div className="glass-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-tide">Your history</p>
                  <p className="mt-2 font-display text-2xl font-bold text-ink">Saved runs</p>
                </div>
                <span className="rounded-full bg-mist px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-tide">
                  {history.length} items
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {history.length ? (
                  history.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{item.meetingTitle}</p>
                          <p className="text-sm text-slate-500">
                            {item.userName} • {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${item.emailSent
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                            }`}
                        >
                          {item.emailSent ? "emailed" : "download only"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{item.overallSummary}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[24px] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                    No saved runs yet. Process one transcript to populate the history panel.
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
