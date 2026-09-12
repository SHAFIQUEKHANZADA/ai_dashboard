import { EmptyState } from "@/components/empty-state";
import type { CallbackRow } from "@/lib/types";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function CallbacksTable({ rows }: { rows: CallbackRow[] }) {
  if (!rows.length) return <EmptyState label="No callbacks needed" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
            <th className="pb-2 font-semibold">Time</th>
            <th className="pb-2 font-semibold">Customer Intent</th>
            <th className="pb-2 text-right font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0">
              <td className="py-2.5 text-muted">{fmtTime(r.time)}</td>
              <td className="py-2.5 text-ink-soft">{r.intent ?? "—"}</td>
              <td className="py-2.5 text-right">
                <span className="rounded-md bg-red/10 px-2 py-0.5 text-[11px] font-semibold text-red">
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
