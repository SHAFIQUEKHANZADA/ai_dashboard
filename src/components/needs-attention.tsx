import { AlertCircle, PhoneMissed, TrendingDown, UserRound } from "lucide-react";
import type { NeedsAttention, AttentionItem } from "@/lib/types";

function fmtWait(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Longer waits read louder.
function waitClass(mins: number): string {
  if (mins >= 180) return "text-red";
  if (mins >= 60) return "text-amber";
  return "text-ink-soft";
}

function MiniList({ items, empty }: { items: AttentionItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2 text-[13px]">
          <span className="flex-1 truncate text-ink-soft">
            {it.reason}
            {it.detail ? <span className="ml-1 text-muted">· {it.detail}</span> : null}
          </span>
          <span className="shrink-0 text-[11px] text-muted">{it.store}</span>
          <span className={`w-14 shrink-0 text-right text-[11px] font-semibold ${waitClass(it.waitMins)}`}>{fmtWait(it.waitMins)}</span>
        </li>
      ))}
    </ul>
  );
}

export function NeedsAttentionSection({ data }: { data: NeedsAttention }) {
  const nothing =
    data.callbacksTotal === 0 && data.deterioratedTotal === 0 && data.humanRequestsTotal === 0;
  if (nothing) return null;

  return (
    <section className="mb-4 rounded-2xl border border-amber/30 bg-amber/[0.04] p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-amber" />
        <h2 className="text-[15px] font-bold text-ink">Needs Attention</h2>
        <span className="text-xs text-muted">Follow-ups waiting on a person</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Callbacks — the main list, with reason · wait · store · owner */}
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-2">
            <PhoneMissed className="h-4 w-4 text-red" />
            <h3 className="text-[13px] font-semibold text-ink">Callbacks needed</h3>
            <span className="rounded-full bg-red/10 px-2 py-0.5 text-[11px] font-semibold text-red">{data.callbacksTotal}</span>
          </div>
          {data.callbacks.length === 0 ? (
            <p className="text-xs text-muted">No callbacks waiting.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-muted/10 text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 font-semibold">Reason</th>
                    <th className="px-3 py-2 font-semibold">Wait</th>
                    <th className="px-3 py-2 font-semibold">Store</th>
                    <th className="px-3 py-2 font-semibold">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {data.callbacks.map((c, i) => (
                    <tr key={i} className="border-t border-line/60">
                      <td className="px-3 py-2 text-ink-soft"><span className="line-clamp-1">{c.reason}</span></td>
                      <td className={`px-3 py-2 font-semibold ${waitClass(c.waitMins)}`}>{fmtWait(c.waitMins)}</td>
                      <td className="px-3 py-2 text-muted">{c.store}</td>
                      <td className="px-3 py-2 text-muted">{c.owner ?? "Unassigned"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deteriorated sentiment + human requests */}
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber" />
              <h3 className="text-[13px] font-semibold text-ink">Sentiment dropped</h3>
              <span className="rounded-full bg-amber/10 px-2 py-0.5 text-[11px] font-semibold text-amber">{data.deterioratedTotal}</span>
            </div>
            <MiniList items={data.deteriorated} empty="None today." />
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <UserRound className="h-4 w-4 text-blue" />
              <h3 className="text-[13px] font-semibold text-ink">Asked for a person</h3>
              <span className="rounded-full bg-blue/10 px-2 py-0.5 text-[11px] font-semibold text-blue">{data.humanRequestsTotal}</span>
            </div>
            <MiniList items={data.humanRequests} empty="None today." />
          </div>
        </div>
      </div>
    </section>
  );
}
