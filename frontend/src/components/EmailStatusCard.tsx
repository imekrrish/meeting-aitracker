type EmailStatusCardProps = {
  sent: boolean;
  message: string;
};

export function EmailStatusCard({ sent, message }: EmailStatusCardProps) {
  return (
    <div
      className={`rounded-[24px] border p-5 ${
        sent ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className="font-display text-lg font-semibold text-ink">
        {sent ? "Email delivered" : "Email needs attention"}
      </p>
      <p className="mt-1 text-sm text-slate-700">{message}</p>
      {!sent ? (
        <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
          Downloads stay available even if SMTP fails
        </p>
      ) : null}
    </div>
  );
}

