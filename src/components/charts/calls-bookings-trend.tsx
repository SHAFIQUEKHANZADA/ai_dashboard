"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { TrendPoint } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

function label(d: string) {
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function CallsBookingsTrend({ data }: { data: TrendPoint[] }) {
  if (!data.length) return <EmptyState />;
  const rows = data.map((d) => ({ ...d, label: label(d.local_date) }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} minTickGap={16} />
          <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)", border: "1px solid var(--line)",
              borderRadius: 10, fontSize: 12, color: "var(--ink)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Line yAxisId="left" type="monotone" dataKey="total_calls" name="Total Calls" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line yAxisId="right" type="monotone" dataKey="appointments_booked" name="Appointments Booked" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
