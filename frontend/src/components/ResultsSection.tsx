import { DownloadActions } from "./DownloadActions";
import { EmailStatusCard } from "./EmailStatusCard";
import { InsightTable } from "./InsightTable";
import type { ProcessResponse } from "../types/api";

type ResultsSectionProps = {
  result: ProcessResponse;
};

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {items.length ? items.map((item) => <p key={item}>• {item}</p>) : <p>No items generated.</p>}
      </div>
    </div>
  );
}

export function ResultsSection({ result }: ResultsSectionProps) {
  const { insights } = result;

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="glass-panel p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-tide">Results</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-ink">
            {insights.meetingTitleSuggestion ?? result.meetingTitle}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-700">{insights.overallSummary}</p>
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
          <div className="mt-6">
            <DownloadActions excelUrl={result.downloads.excelUrl} pdfUrl={result.downloads.pdfUrl} />
          </div>
        </div>

        <EmailStatusCard sent={result.email.sent} message={result.email.message} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] bg-ink p-5 text-white">
          <p className="text-xs uppercase tracking-[0.22em] text-blue-200">Executive Summary</p>
          <p className="mt-3 text-sm leading-7 text-blue-50">
            {insights.executiveSummary ?? "No executive summary generated."}
          </p>
        </div>
        <div className="rounded-[24px] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Manager Summary</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {insights.managerSummary ?? "No manager summary generated."}
          </p>
        </div>
        <div className="rounded-[24px] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Highlight Reel</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {insights.highlightReel.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
        <div className="rounded-[24px] bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Standup Conversion</p>
          <div className="mt-3 text-sm text-slate-700">
            <p className="font-semibold text-ink">Yesterday</p>
            {insights.dailyStandupFormat.yesterday.map((item) => (
              <p key={item}>• {item}</p>
            ))}
            <p className="mt-3 font-semibold text-ink">Today</p>
            {insights.dailyStandupFormat.today.map((item) => (
              <p key={item}>• {item}</p>
            ))}
            <p className="mt-3 font-semibold text-ink">Blockers</p>
            {insights.dailyStandupFormat.blockers.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Key Decisions" items={insights.keyDecisions} />
        <ListCard title="Blockers" items={insights.blockers} />
        <ListCard title="Risks & Dependencies" items={insights.riskAndDependencySection} />
        <ListCard title="Suggested Next Meeting Agenda" items={insights.suggestedNextMeetingAgenda} />
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-tide">Structured Updates</p>
            <h3 className="mt-2 font-display text-2xl font-bold text-ink">Extracted rows preview</h3>
          </div>
          <p className="text-sm text-slate-500">{insights.rows.length} extracted items</p>
        </div>
        <div className="mt-5">
          <InsightTable rows={insights.rows} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="font-display text-lg font-semibold text-ink">Owner-wise Action Tracker</p>
          <div className="mt-3 space-y-4 text-sm text-slate-700">
            {insights.ownerWiseActionTracker.map((entry, index) => (
              <div key={`${entry.owner ?? "owner"}-${index}`}>
                <p className="font-semibold text-ink">{entry.owner ?? "Unassigned"}</p>
                {entry.items.map((item) => (
                  <p key={item}>• {item}</p>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5">
          <p className="font-display text-lg font-semibold text-ink">Follow-up Email Draft</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
            {insights.followUpEmailDraft ?? "No draft generated."}
          </p>
        </div>
      </div>
    </section>
  );
}

