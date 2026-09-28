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

  // Horizontal bars: store names get a full, readable line on the left instead of
  // colliding on a cramped x-axis. Height grows with the number of stores so the
  // rows never squeeze together as the group adds dealerships.
  const height = Math.max(200, rows.length * 46 + 20);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={rows}
          margin={{ top: 4, right: 36, left: 8, bottom: 4 }}
          barCategoryGap="30%"
        >
          <CartesianGrid horizontal={false} stroke="var(--line)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="short"
            width={132}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "var(--ink)" }}
            interval={0}
          />
          <Bar dataKey="appointments_booked" radius={[0, 6, 6, 0]} maxBarSize={26}>
            {rows.map((_, i) => (
              <Cell key={i} fill={BARS[i % BARS.length]} />
            ))}
            <LabelList
              dataKey="appointments_booked"
              position="right"
              style={{ fontSize: 13, fontWeight: 700, fill: "var(--ink)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
