"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/empty-state";

export function TransfersBreakdown({
  successful, failed, total,
}: { successful: number; failed: number; total: number }) {
  if (total === 0) return <EmptyState />;
  const data = [
    { name: "Successful Transfers", value: successful, color: "#22c55e" },
    { name: "Failed Transfers", value: failed, color: "#ef4444" },
  ];
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <div className="relative h-[170px] w-[170px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={56} outerRadius={82} paddingAngle={2} stroke="none">
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
  );
}
