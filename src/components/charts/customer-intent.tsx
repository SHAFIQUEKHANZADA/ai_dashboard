"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { IntentSlice } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

const PALETTE = ["#2563eb", "#38bdf8", "#22c55e", "#f59e0b", "#8b5cf6", "#94a3b8", "#ec4899", "#14b8a6", "#f97316"];

export function CustomerIntent({ slices, total }: { slices: IntentSlice[]; total: number }) {
  if (!slices.length || total === 0) return <EmptyState />;
  const data = slices.map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius={62}
              outerRadius={90}
              paddingAngle={1.5}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-ink">{total.toLocaleString()}</span>
          <span className="text-[11px] text-muted">Total Calls</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2 self-stretch">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 text-ink-soft">{d.label}</span>
            <span className="font-semibold text-ink">{d.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
