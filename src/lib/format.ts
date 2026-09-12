import type { GoodDirection, MetricUnit } from "./types";

// All dealership data is in Central Time (the GHL/myKaarma zone). Every displayed
// timestamp uses this — never the viewer's browser timezone.
export const STORE_TZ = "America/Chicago";

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: STORE_TZ,
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: STORE_TZ,
  });
}

export function fmtDate(iso: string): string {
  // `iso` may be a YYYY-MM-DD date string or a full timestamp.
  const d = iso.length === 10 ? new Date(iso + "T12:00:00Z") : new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: STORE_TZ });
}

// Format a metric value for display. Returns "—" for null (awaiting data).
export function formatMetric(value: number | null, unit: MetricUnit | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  switch (unit) {
    case "currency":
      return value >= 1000
        ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        : `$${value.toFixed(2)}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "score":
      return `${value.toFixed(1)} / 5.0`;
    case "count":
    default:
      return value.toLocaleString();
  }
}

export interface Delta {
  pct: number | null; // percentage change vs previous
  abs: number | null; // absolute change
  good: boolean | null; // true = good direction, false = bad, null = neutral/no basis
  arrow: "up" | "down" | "flat";
  label: string; // e.g. "+18%" or "—"
}

// Compute the delta vs the previous period, honoring the metric's stored
// good_direction (down is good for cost/failed/dropped/callbacks).
export function computeDelta(
  current: number | null,
  previous: number | null,
  goodDirection: GoodDirection,
): Delta {
  if (current === null || previous === null) {
    return { pct: null, abs: null, good: null, arrow: "flat", label: "—" };
  }
  const abs = current - previous;
  const pct = previous === 0 ? (current === 0 ? 0 : 100) : (abs / Math.abs(previous)) * 100;
  const arrow: Delta["arrow"] = abs > 0 ? "up" : abs < 0 ? "down" : "flat";
  let good: boolean | null = null;
  if (abs !== 0) {
    const rising = abs > 0;
    good = goodDirection === "up" ? rising : !rising;
  }
  const sign = pct > 0 ? "+" : "";
  const label = `${sign}${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`;
  return { pct, abs, good, arrow, label };
}

// "topic-ro-status" -> "RO Status"; "scheduling" -> "Scheduling".
export function humanizeIntent(raw: string): string {
  const s = raw.replace(/^topic-/, "").replace(/[-_]/g, " ").trim();
  return s
    .split(" ")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}
