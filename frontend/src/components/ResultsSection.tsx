import { DownloadActions } from "./DownloadActions";
import { EmailStatusCard } from "./EmailStatusCard";
import type { ProcessResponse } from "../types/api";

type ResultsSectionProps = {
  result: ProcessResponse;
};

export function ResultsSection({ result }: ResultsSectionProps) {
  const { insights } = result;

  const hasBlockers = insights.blockers && insights.blockers.length > 0;

  return (
    <section className="space-y-6">
      {/* Prominent Success Message */}
      <div className="rounded-[32px] bg-emerald-500/10 border border-emerald-500/20 p-8 text-center text-emerald-900 shadow-sm transition-all hover:shadow-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg mb-4 text-2xl">
          ✓
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight">Meeting Summarized!</h2>
        <p className="mt-2 text-lg opacity-80 max-w-xl mx-auto">
          We have successfully processed your transcript and generated the Microsoft Excel and PDF artifacts. <strong>Please download them using the buttons below—they will only be available once!</strong>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-tide">Synopsis</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink">
            {insights.meetingTitleSuggestion ?? result.meetingTitle}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">{insights.overallSummary}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-mist px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-tide">
              {result.source.label ?? "Manual transcript"}
            </span>
            {result.projectName ? (
              <span className="rounded-full bg-sand px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                {result.projectName}
              </span>
            ) : null}
          </div>
          <div className="mt-6 border-t border-slate-100 pt-6">
            <DownloadActions excelUrl={result.downloads.excelUrl} pdfUrl={result.downloads.pdfUrl} />
          </div>
        </div>

        <EmailStatusCard sent={result.email.sent} message={result.email.message} />
      </div>

      {/* Simplified Highlight Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-display text-xl font-bold text-ink mb-4">⭐ Key Decisions</p>
          <div className="space-y-3 text-sm text-slate-700">
            {insights.keyDecisions && insights.keyDecisions.length > 0 ? (
              insights.keyDecisions.map((item, idx) => (
                <div key={idx} className="flex gap-3 bg-slate-50 rounded-xl p-3">
                  <span className="text-blue-500 font-bold">•</span>
                  <p>{item}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic p-3">No key decisions identified.</p>
            )}
          </div>
        </div>

        <div className={`rounded-[24px] border p-6 shadow-sm transition-colors ${hasBlockers ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className={`font-display text-xl font-bold mb-4 ${hasBlockers ? 'text-red-700' : 'text-ink'}`}>
            🚨 Blockers & Risks
          </p>
          <div className="space-y-3 text-sm">
            {hasBlockers ? (
              insights.blockers.map((item, idx) => (
                <div key={idx} className="flex gap-3 bg-red-100/50 rounded-xl p-3 text-red-900 border border-red-100">
                  <span className="text-red-500 font-bold">⚠️</span>
                  <p>{item}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-500 italic p-3">No critical blockers identified in this meeting.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

