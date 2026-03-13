import { useState, useEffect, type FormEvent } from "react";

type AuthPageProps = {
    onAuthSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

type AuthTab = "login" | "register";
type AuthStep = "form" | "otp";

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
    const [tab, setTab] = useState<AuthTab>("login");
    const [step, setStep] = useState<AuthStep>("form");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otpCode, setOtpCode] = useState("");

    // OTP timer
    const [otpTimer, setOtpTimer] = useState(0);

    useEffect(() => {
        if (otpTimer <= 0) return;
        const interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
        return () => clearInterval(interval);
    }, [otpTimer]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const resetForm = () => {
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setOtpCode("");
        setError(null);
        setSuccess(null);
        setStep("form");
    };

    const switchTab = (newTab: AuthTab) => {
        setTab(newTab);
        resetForm();
    };

    const handleRegister = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, confirmPassword })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || data.data?.message || "Registration failed.");
            setSuccess("OTP sent to your email! Check your inbox.");
            setStep("otp");
            setOtpTimer(300); // 5 minutes
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: otpCode })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "OTP verification failed.");
            onAuthSuccess(data.data.token, data.data.user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setError(null);
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/resend-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to resend OTP.");
            setSuccess("New OTP sent!");
            setOtpTimer(300);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Login failed.");
            onAuthSuccess(data.data.token, data.data.user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-hero-grid flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-tide">Meeting Tracker AI</p>
                    <h1 className="mt-3 font-display text-4xl font-bold text-ink">Welcome</h1>
                    <p className="mt-2 text-sm text-slate-600">Sign in or create an account to get started.</p>
                </div>

                {/* Glass card */}
                <div className="glass-panel p-8 space-y-6">
                    {/* Tab buttons */}
                    <div className="flex rounded-2xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => switchTab("login")}
                            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${tab === "login"
                                    ? "bg-white text-ink shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => switchTab("register")}
                            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${tab === "register"
                                    ? "bg-white text-ink shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Error / Success */}
                    {error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {success}
                        </div>
                    )}

                    {/* LOGIN FORM */}
                    {tab === "login" && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <label className="block space-y-1.5 text-sm text-slate-700">
                                <span className="font-medium">Email</span>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
                                    placeholder="you@example.com"
                                />
                            </label>
                            <label className="block space-y-1.5 text-sm text-slate-700">
                                <span className="font-medium">Password</span>
                                <input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
                                    placeholder="••••••••"
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-2xl bg-ink py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-70"
                            >
                                {isLoading ? "Signing in..." : "Sign In"}
                            </button>
                        </form>
                    )}

                    {/* REGISTER FORM */}
                    {tab === "register" && step === "form" && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <label className="block space-y-1.5 text-sm text-slate-700">
                                <span className="font-medium">Full Name</span>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
                                    placeholder="Aarav Mehta"
                                />
                            </label>
                            <label className="block space-y-1.5 text-sm text-slate-700">
                                <span className="font-medium">Email</span>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
                                    placeholder="you@example.com"
                                />
                            </label>
                            <label className="block space-y-1.5 text-sm text-slate-700">
                                <span className="font-medium">Password</span>
                                <input
                                    required
                                    type="password"
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
                                    placeholder="Min 6 characters"
                                />
                            </label>
                            <label className="block space-y-1.5 text-sm text-slate-700">
                                <span className="font-medium">Confirm Password</span>
                                <input
                                    required
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-tide"
                                    placeholder="Re-enter password"
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-2xl bg-ink py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-70"
                            >
                                {isLoading ? "Creating account..." : "Create Account"}
                            </button>
                        </form>
                    )}

                    {/* OTP VERIFICATION */}
                    {tab === "register" && step === "otp" && (
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            <div className="text-center">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl text-blue-600 mb-4">
                                    ✉️
                                </div>
                                <p className="text-sm text-slate-700">
                                    We sent a 6-digit code to <strong>{email}</strong>
                                </p>
                                {otpTimer > 0 && (
                                    <p className="mt-2 text-sm font-semibold text-tide">
                                        Expires in {formatTime(otpTimer)}
                                    </p>
                                )}
                                {otpTimer <= 0 && (
                                    <p className="mt-2 text-sm text-red-600 font-semibold">
                                        OTP expired.{" "}
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            className="underline hover:text-red-800"
                                        >
                                            Resend
                                        </button>
                                    </p>
                                )}
                            </div>
                            <label className="block space-y-1.5 text-sm text-slate-700">
                                <span className="font-medium">Verification Code</span>
                                <input
                                    required
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl tracking-[12px] font-bold outline-none transition focus:border-tide"
                                    placeholder="000000"
                                />
                            </label>
                            <button
                                type="submit"
                                disabled={isLoading || otpTimer <= 0}
                                className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-70"
                            >
                                {isLoading ? "Verifying..." : "Verify & Continue"}
                            </button>
                            {otpTimer > 0 && (
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={isLoading}
                                    className="w-full text-center text-sm text-slate-500 hover:text-tide transition"
                                >
                                    Didn't receive? Resend OTP
                                </button>
                            )}
                        </form>
                    )}
                </div>

                <p className="mt-6 text-center text-xs text-slate-400">
                    Meeting Tracker AI • Powered by OpenAI & MongoDB
                </p>
            </div>
        </div>
    );
}
