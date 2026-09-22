"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown, PhoneMissed, TrendingDown, UserRound } from "lucide-react";
import type { NeedsAttention, AttentionItem } from "@/lib/types";

function fmtWait(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function waitClass(mins: number): string {
  if (mins >= 180) return "text-red";
  if (mins >= 60) return "text-amber";
  return "text-muted";
}

function MiniList({ items, empty }: { items: AttentionItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {items.slice(0, 5).map((it, i) => (
        <li key={i} className="flex items-center gap-2 text-[12.5px]">
          <span className="flex-1 truncate text-ink-soft">{it.reason}</span>
          <span className="shrink-0 truncate text-[11px] text-muted">{it.store}</span>
          <span className={`w-12 shrink-0 text-right text-[11px] font-semibold ${waitClass(it.waitMins)}`}>{fmtWait(it.waitMins)}</span>
        </li>
      ))}
    </ul>
  );
}

function Chip({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft">
      <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${tone}`}>{count}</span>
      {label}
    </span>
  );
}

export function NeedsAttentionSection({ data }: { data: NeedsAttention }) {
  const [open, setOpen] = useState(false);
  if (data.callbacksTotal === 0 && data.deterioratedTotal === 0 && data.humanRequestsTotal === 0) return null;

  return (
    <section className="mb-4 rounded-xl border border-amber/30 bg-amber/[0.04]">
      {/* Slim header — the three counts at a glance; click to expand detail. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
      >
        <AlertCircle className="h-4 w-4 shrink-0 text-amber" />
        <span className="text-[13px] font-bold text-ink">Needs Attention</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Chip label="Callbacks" count={data.callbacksTotal} tone="bg-red/10 text-red" />
          <Chip label="Sentiment dropped" count={data.deterioratedTotal} tone="bg-amber/15 text-amber" />
          <Chip label="Asked for a person" count={data.humanRequestsTotal} tone="bg-blue/10 text-blue" />
        </div>
        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-5 border-t border-amber/20 p-4 lg:grid-cols-3">
          {/* Callbacks — reason · wait · store (owner returns once GHL owner is wired) */}
          <div className="lg:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <PhoneMissed className="h-4 w-4 text-red" />
              <h3 className="text-[13px] font-semibold text-ink">Callbacks needed</h3>
            </div>
            {data.callbacks.length === 0 ? (
              <p className="text-xs text-muted">No callbacks waiting.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-line">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-muted/10 text-left text-[10px] uppercase tracking-wide text-muted">
                      <th className="px-3 py-1.5 font-semibold">Reason</th>
                      <th className="px-3 py-1.5 font-semibold">Wait</th>
                      <th className="px-3 py-1.5 font-semibold">Store</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.callbacks.slice(0, 6).map((c, i) => (
                      <tr key={i} className="border-t border-line/60">
                        <td className="px-3 py-1.5 text-ink-soft"><span className="line-clamp-1">{c.reason}</span></td>
                        <td className={`px-3 py-1.5 font-semibold ${waitClass(c.waitMins)}`}>{fmtWait(c.waitMins)}</td>
                        <td className="px-3 py-1.5 text-muted">{c.store}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.callbacksTotal > 6 && (
                  <div className="bg-muted/5 px-3 py-1.5 text-[11px] text-muted">+{data.callbacksTotal - 6} more waiting</div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber" />
                <h3 className="text-[13px] font-semibold text-ink">Sentiment dropped</h3>
              </div>
              <MiniList items={data.deteriorated} empty="None today." />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-blue" />
                <h3 className="text-[13px] font-semibold text-ink">Asked for a person</h3>
              </div>
              <MiniList items={data.humanRequests} empty="None today." />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
