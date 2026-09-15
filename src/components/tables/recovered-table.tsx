import { formatMetric, fmtTime } from "@/lib/format";
import { EmptyState } from "@/components/empty-state";
import type { RecoveredRow } from "@/lib/types";

export function RecoveredTable({ rows }: { rows: RecoveredRow[] }) {
  if (!rows.length) return <EmptyState label="Awaiting data" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
            <th className="pb-2 font-semibold">Time</th>
            <th className="pb-2 font-semibold">Customer Intent</th>
            <th className="pb-2 font-semibold">Outcome</th>
            <th className="pb-2 text-right font-semibold">Est. Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0">
              <td className="py-2.5 text-muted">{fmtTime(r.time)}</td>
              <td className="py-2.5 text-ink-soft">{r.intent ?? "—"}</td>
              <td className="py-2.5">
                <span className="rounded-md bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">
                  {r.outcome}
                </span>
              </td>
              <td className="py-2.5 text-right font-semibold text-ink">
                {r.value === null ? "—" : formatMetric(r.value, "currency")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
