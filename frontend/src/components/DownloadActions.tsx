import { toAbsoluteUrl } from "../lib/api";

type DownloadActionsProps = {
  excelUrl: string;
  pdfUrl: string;
};

export function DownloadActions({ excelUrl, pdfUrl }: DownloadActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={toAbsoluteUrl(excelUrl)}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-900"
      >
        Download Excel
      </a>
      <a
        href={toAbsoluteUrl(pdfUrl)}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-tide hover:text-tide"
      >
        Download PDF
      </a>
    </div>
  );
}

