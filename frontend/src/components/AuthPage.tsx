import { useState, type FormEvent } from "react";

type AuthPageProps = {
  onAuthSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnectingMicrosoft, setIsConnectingMicrosoft] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const url = mode === "login" ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/register`;
      const body =
        mode === "login"
          ? { email, password }
          : { name, email, password, confirmPassword };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || json.data?.message || "Authentication failed.");
      }

      const { token, user } = json.data;
      onAuthSuccess(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectMicrosoft = () => {
    setIsConnectingMicrosoft(true);
    window.location.href = `${API_URL}/auth/microsoft/login`;
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-grid px-4">
      <div className="glass-panel w-full max-w-md p-8">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.35em] text-tide">
          Meeting Tracker AI
        </p>
        <h1 className="mt-5 text-center font-display text-4xl font-bold text-ink">
          {mode === "login" ? "Sign In" : "Create Account"}
        </h1>
        <p className="mt-3 text-center text-sm text-slate-600">
          {mode === "login"
            ? "Enter your credentials to continue."
            : "Register a new account to get started."}
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "register" ? (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium text-slate-700 mb-1">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-tide focus:ring-1 focus:ring-tide/30"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-tide focus:ring-1 focus:ring-tide/30"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-tide focus:ring-1 focus:ring-tide/30"
            />
          </div>

          {mode === "register" ? (
            <div>
              <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-tide focus:ring-1 focus:ring-tide/30"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium uppercase tracking-widest text-slate-400">or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Microsoft OAuth — optional */}
        <button
          type="button"
          onClick={handleConnectMicrosoft}
          disabled={isConnectingMicrosoft}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#0f5ea8] hover:text-[#0f5ea8] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          {isConnectingMicrosoft ? "Redirecting..." : "Sign in with Microsoft"}
        </button>

        {/* Toggle mode */}
        <p className="mt-6 text-center text-sm text-slate-600">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button type="button" onClick={toggleMode} className="font-semibold text-tide hover:underline">
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={toggleMode} className="font-semibold text-tide hover:underline">
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
