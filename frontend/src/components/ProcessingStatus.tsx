type ProcessingStatusProps = {
  isLoading: boolean;
};

export function ProcessingStatus({ isLoading }: ProcessingStatusProps) {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="glass-panel border-tide/20 p-5">
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-tide/20 border-t-tide" />
        <div>
          <p className="font-display text-lg font-semibold text-ink">Processing transcript</p>
          <p className="text-sm text-slate-600">
            Normalizing text, extracting structured insights, generating reports, and sending email.
          </p>
        </div>
      </div>
    </div>
  );
}

