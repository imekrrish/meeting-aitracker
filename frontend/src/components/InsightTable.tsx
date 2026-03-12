import type { InsightRow } from "../types/api";

type InsightTableProps = {
  rows: InsightRow[];
};

export function InsightTable({ rows }: InsightTableProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              {[
                "Speaker",
                "Work Done",
                "Blocker",
                "Action Item",
                "Owner",
                "ETA",
                "Priority",
                "Status",
                "Notes",
                "Confidence"
              ].map((header) => (
                <th key={header} className="px-4 py-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.owner ?? "row"}-${index}`} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">{row.speaker ?? "N/A"}</td>
                <td className="px-4 py-3">{row.workDone ?? "N/A"}</td>
                <td className="px-4 py-3">{row.blocker ?? "N/A"}</td>
                <td className="px-4 py-3">{row.actionItem ?? "N/A"}</td>
                <td className="px-4 py-3">{row.owner ?? "N/A"}</td>
                <td className="px-4 py-3">{row.eta ?? "N/A"}</td>
                <td className="px-4 py-3">{row.priority ?? "N/A"}</td>
                <td className="px-4 py-3">{row.status ?? "N/A"}</td>
                <td className="px-4 py-3">{row.notes ?? "N/A"}</td>
                <td className="px-4 py-3">{Math.round(row.confidence * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

