import { useEffect, useState } from "react";

type AuthPageProps = {
  onAuthSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function AuthPage(_: AuthPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [isConnectingMicrosoft, setIsConnectingMicrosoft] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError) {
      setError(oauthError);
    }
  }, []);

  const handleConnectMicrosoft = () => {
    setIsConnectingMicrosoft(true);
    window.location.href = `${API_URL}/auth/microsoft/login`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-grid px-4">
      <div className="glass-panel w-full max-w-md p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-tide">
          Meeting Tracker AI
        </p>
        <h1 className="mt-5 font-display text-4xl font-bold text-ink">
          Sign in
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Connect your Microsoft account to continue.
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleConnectMicrosoft}
          disabled={isConnectingMicrosoft}
          className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-[#0f5ea8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0b4d8b] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isConnectingMicrosoft ? "Redirecting..." : "Connect Microsoft Account"}
        </button>
      </div>
    </div>
  );
}
