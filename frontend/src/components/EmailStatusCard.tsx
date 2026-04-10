type EmailStatusCardProps = {
  sent: boolean;
  message: string;
};

export function EmailStatusCard(_props: EmailStatusCardProps) {
  return (
    <div className="glass-panel p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-tide">Email Delivery</p>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="font-display text-lg font-bold text-amber-900">🚧 SMTP In Progress</p>
        <p className="mt-2 text-sm text-amber-800 leading-6">
          Email delivery is currently being configured. Once SMTP is set up, reports will be automatically emailed to your registered address.
        </p>
        <p className="mt-3 text-sm font-semibold text-amber-700">
          For now, please download the Excel and PDF files directly.
        </p>
      </div>
    </div>
  );
}
