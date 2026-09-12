"use client";

import {
  BarChart, Bar, XAxis, YAxis, LabelList, Cell, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { StoreBookings } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

const BARS = ["#2563eb", "#38bdf8", "#8b5cf6", "#22c55e", "#f59e0b"];

// keep the store name short for the axis ("McGrath Honda of St. Charles" -> "St. Charles Honda")
function shortName(name: string): string {
  const n = name.replace(/^McGrath\s+/, "");
  const m = n.match(/^(Honda|Acura|Kia|Volvo|Audi)\s+of\s+(.+)$/i);
  if (m) return `${m[2]} ${m[1]}`;
  return n;
}

export function AppointmentsByStore({ data }: { data: StoreBookings[] }) {
  const rows = data.map((d) => ({ ...d, short: shortName(d.name) }));
  const hasData = rows.some((r) => r.appointments_booked > 0);
  if (!rows.length || !hasData) return <EmptyState />;

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="short" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted)" }} allowDecimals={false} />
          <Bar dataKey="appointments_booked" radius={[6, 6, 0, 0]} maxBarSize={70}>
            {rows.map((_, i) => (
              <Cell key={i} fill={BARS[i % BARS.length]} />
            ))}
            <LabelList dataKey="appointments_booked" position="top" style={{ fontSize: 13, fontWeight: 700, fill: "var(--ink)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
