import { createServiceClient } from "@/lib/supabase/server";
import { humanizeIntent } from "@/lib/format";
import type {
  Store,
  MetricDefinition,
  MetricValue,
  IntentSlice,
  TrendPoint,
  StoreBookings,
  CallbackRow,
  RecoveredRow,
} from "@/lib/types";

// NOTE: reads use the service client for now so the dashboard renders during
// development. Once auth lands, swap to the request-scoped session client so RLS
// (can_see_store) enforces access per user. App-level scope is still applied here.

// Metrics with no live feed yet — always render "Awaiting data", never a fake 0.
const AWAITING = new Set(["ai_spend", "cost_per_booking", "recovered_count", "secret_shopper_score"]);
const SUM_KEYS = new Set([
  "total_calls", "appointments_booked", "eligible_calls", "transfers",
  "failed_transfers", "dropped_calls", "callbacks_needed", "recovered_count", "ai_spend",
]);

export interface DashboardData {
  date: string;
  scope: string; // "group" | store id
  headline: MetricValue[];
  secondary: MetricValue[];
  intent: IntentSlice[];
  intentTotal: number;
  apptsByStore: StoreBookings[];
  showApptsByStore: boolean;
  trend: TrendPoint[];
  transfers: { successful: number; failed: number; total: number };
  callbacks: CallbackRow[];
  recovered: RecoveredRow[];
  lastUpdated: string | null;
}

interface DM {
  store_id: string;
  local_date: string;
  [k: string]: unknown;
}

export async function getStores(): Promise<Store[]> {
  const sb = createServiceClient();
  const { data } = await sb.from("esther_stores").select("*").eq("active", true).order("sort_order");
  return (data ?? []) as Store[];
}

function num(row: DM | undefined, key: string): number | null {
  if (!row) return null;
  const v = row[key];
  return v === null || v === undefined ? null : Number(v);
}

// Aggregate a set of store-day rows into one value for a metric key.
function aggregate(rows: DM[], key: string): number | null {
  if (rows.length === 0) return null;
  if (key === "booking_pct") {
    const appts = rows.reduce((s, r) => s + (num(r, "appointments_booked") ?? 0), 0);
    const elig = rows.reduce((s, r) => s + (num(r, "eligible_calls") ?? 0), 0);
    return elig > 0 ? (appts / elig) * 100 : null;
  }
  if (SUM_KEYS.has(key)) {
    return rows.reduce((s, r) => s + (num(r, key) ?? 0), 0);
  }
  // average (e.g. secret_shopper_score)
  const vals = rows.map((r) => num(r, key)).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export async function getDashboardData(opts: {
  storeId: string | null; // null => group total
  date: string; // YYYY-MM-DD
  storeIds: string[]; // stores in scope (respecting access)
  storeNames: Map<string, string>;
}): Promise<DashboardData> {
  const sb = createServiceClient();
  const { storeId, date, storeIds, storeNames } = opts;
  const scopeIds = storeId ? [storeId] : storeIds;

  const prev = new Date(date + "T00:00:00Z");
  prev.setUTCDate(prev.getUTCDate() - 1);
  const prevDate = prev.toISOString().slice(0, 10);
  const start14 = new Date(date + "T00:00:00Z");
  start14.setUTCDate(start14.getUTCDate() - 13);
  const start14Date = start14.toISOString().slice(0, 10);

  const [defsRes, curRes, prevRes, trendRes, cbRes, recRes] = await Promise.all([
    sb.from("esther_metric_definitions").select("*").eq("enabled", true).order("sort_order"),
    sb.from("esther_daily_metrics").select("*").eq("local_date", date).in("store_id", scopeIds),
    sb.from("esther_daily_metrics").select("*").eq("local_date", prevDate).in("store_id", scopeIds),
    sb.from("esther_daily_metrics").select("store_id,local_date,total_calls,appointments_booked")
      .gte("local_date", start14Date).lte("local_date", date).in("store_id", scopeIds),
    sb.from("esther_calls").select("started_at,intent,local_date,store_id")
      .eq("local_date", date).eq("callback_needed", true).in("store_id", scopeIds)
      .order("started_at").limit(8),
    sb.from("esther_recovered_opportunities").select("*")
      .eq("local_date", date).in("store_id", scopeIds).order("recovered_at").limit(8),
  ]);

  const defs = (defsRes.data ?? []) as MetricDefinition[];
  const cur = (curRes.data ?? []) as DM[];
  const prevRows = (prevRes.data ?? []) as DM[];

  const buildMetric = (d: MetricDefinition): MetricValue => {
    const awaiting = AWAITING.has(d.key);
    return {
      key: d.key,
      label: d.label,
      unit: d.unit,
      good_direction: d.good_direction,
      value: awaiting ? null : aggregate(cur, d.key),
      previous: awaiting ? null : aggregate(prevRows, d.key),
      awaiting,
    };
  };

  const headline = defs.filter((d) => d.display_group === "headline").map(buildMetric);
  const secondary = defs.filter((d) => d.display_group === "secondary").map(buildMetric);

  // Customer Intent — merge intent_breakdown JSON across the scope's rows.
  const intentTotals: Record<string, number> = {};
  for (const r of cur) {
    const ib = (r.intent_breakdown as Record<string, number>) ?? {};
    for (const [k, v] of Object.entries(ib)) intentTotals[k] = (intentTotals[k] ?? 0) + Number(v);
  }
  const intentTotal = Object.values(intentTotals).reduce((a, b) => a + b, 0);
  const intent: IntentSlice[] = Object.entries(intentTotals)
    .map(([k, count]) => ({
      key: k,
      label: humanizeIntent(k),
      count,
      pct: intentTotal ? Math.round((count / intentTotal) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Appointments by store (only meaningful for the group view).
  const apptsByStore: StoreBookings[] = scopeIds
    .map((id) => ({
      store_id: id,
      name: storeNames.get(id) ?? "Store",
      appointments_booked: aggregate(cur.filter((r) => r.store_id === id), "appointments_booked") ?? 0,
    }))
    .sort((a, b) => b.appointments_booked - a.appointments_booked);

  // 14-day trend.
  const trendMap = new Map<string, TrendPoint>();
  for (const r of (trendRes.data ?? []) as DM[]) {
    const key = r.local_date;
    const t = trendMap.get(key) ?? { local_date: key, total_calls: 0, appointments_booked: 0 };
    t.total_calls += num(r, "total_calls") ?? 0;
    t.appointments_booked += num(r, "appointments_booked") ?? 0;
    trendMap.set(key, t);
  }
  const trend = Array.from(trendMap.values()).sort((a, b) => a.local_date.localeCompare(b.local_date));

  const totalTransfers = aggregate(cur, "transfers") ?? 0;
  const failedTransfers = aggregate(cur, "failed_transfers") ?? 0;
  const transfers = {
    total: totalTransfers,
    failed: failedTransfers,
    successful: Math.max(0, totalTransfers - failedTransfers),
  };

  const callbacks: CallbackRow[] = ((cbRes.data ?? []) as { started_at: string; intent: string | null }[]).map(
    (c) => ({ time: c.started_at, intent: c.intent ? humanizeIntent(c.intent) : null, status: "Callback Needed" }),
  );

  const recovered: RecoveredRow[] = ((recRes.data ?? []) as { recovered_at: string; intent: string | null; outcome: string; value: number | null }[]).map(
    (r) => ({ time: r.recovered_at, intent: r.intent ? humanizeIntent(r.intent) : null, outcome: r.outcome ?? "Booked", value: r.value }),
  );

  const lastUpdated =
    cur.map((r) => r.updated_at as string).filter(Boolean).sort().pop() ?? null;

  return {
    date,
    scope: storeId ?? "group",
    headline,
    secondary,
    intent,
    intentTotal,
    apptsByStore,
    showApptsByStore: !storeId && scopeIds.length > 1,
    trend,
    transfers,
    callbacks,
    recovered,
    lastUpdated,
  };
}
