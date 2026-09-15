"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/empty-state";

export function TransfersBreakdown({
  successful, failed, total, reasons = [],
}: {
  successful: number;
  failed: number;
  total: number;
  reasons?: { key: string; label: string; count: number; pct: number }[];
}) {
  if (total === 0) return <EmptyState />;
  const data = [
    { name: "Successful Transfers", value: successful, color: "#22c55e" },
    { name: "Failed Transfers", value: failed, color: "#ef4444" },
  ];
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
        <div className="relative h-[150px] w-[150px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-ink">{total.toLocaleString()}</span>
            <span className="text-[11px] text-muted">Total Transfers</span>
          </div>
        </div>
        <ul className="flex-1 space-y-3 self-stretch">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2 text-[13px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <span className="flex-1 text-ink-soft">{d.name}</span>
              <span className="font-semibold text-ink">{d.value.toLocaleString()}</span>
              <span className="w-9 text-right text-muted">{pct(d.value)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Why the transfers happened (AI-classified reason codes) */}
      {reasons.length > 0 && (
        <div className="border-t border-line/60 pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Why transfers happened</p>
          <ul className="space-y-2">
            {reasons.map((r) => (
              <li key={r.key} className="flex items-center gap-2 text-[13px]">
                <span className="flex-1 truncate text-ink-soft">{r.label}</span>
                <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted/15 sm:block">
                  <span className="block h-full rounded-full bg-blue" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="w-6 text-right font-semibold text-ink">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
