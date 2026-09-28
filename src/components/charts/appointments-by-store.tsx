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

// Straight (horizontal) axis label: city on the first line, brand on the second,
// centered under the bar — readable for 5+ stores without angling anything.
function StoreTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  const parts = String(payload?.value ?? "").split(" ");
  const brand = parts.length > 1 ? parts[parts.length - 1] : "";
  const city = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="var(--muted)" fontSize={11}>
        <tspan x={0} dy={14}>{city}</tspan>
        {brand && <tspan x={0} dy={13}>{brand}</tspan>}
      </text>
    </g>
  );
}

export function AppointmentsByStore({ data }: { data: StoreBookings[] }) {
  const rows = data.map((d) => ({ ...d, short: shortName(d.name) }));
  const hasData = rows.some((r) => r.appointments_booked > 0);
  if (!rows.length || !hasData) return <EmptyState />;

  // Vertical columns (count on the Y axis), matching the other charts. Store names
  // sit on the X axis, angled so they stay readable even with 5+ dealerships.
  return (
    <div style={{ height: 300 }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 18, right: 8, left: 0, bottom: 12 }} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="short"
            interval={0}
            tickLine={false}
            axisLine={false}
            height={40}
            tick={<StoreTick />}
          />
          <YAxis
            type="number"
            width={28}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            allowDecimals={false}
          />
          <Bar dataKey="appointments_booked" radius={[6, 6, 0, 0]} maxBarSize={54}>
            {rows.map((_, i) => (
              <Cell key={i} fill={BARS[i % BARS.length]} />
            ))}
            <LabelList
              dataKey="appointments_booked"
              position="top"
              style={{ fontSize: 13, fontWeight: 700, fill: "var(--ink)" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
