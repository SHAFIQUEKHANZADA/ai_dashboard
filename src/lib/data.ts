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
  EquityRow,
  EquityFunnel,
} from "@/lib/types";

// NOTE: reads use the service client for now so the dashboard renders during
// development. Once auth lands, swap to the request-scoped session client so RLS
// (can_see_store) enforces access per user. App-level scope is still applied here.

// Metrics with no live feed yet — always render "Awaiting data", never a fake 0.
// (ai_spend + cost_per_booking flow from the billing import; secret_shopper_score
// now flows from the QA grader — both fall back to "Awaiting data" on their own
// whenever the underlying data is missing.)
const AWAITING = new Set<string>([]);

// Effective AI cost per call, derived from the imported GHL billing (Voice/AI $ ÷
// calls) — group average was $0.326 across all stores, and per-store it held tight
// ($0.29–0.35). Used to show a LIVE estimated AI Spend / Cost per Booking on days
// that have no billed CSV yet (today, this week). The real billed figures replace
// the estimate automatically as soon as a billing CSV covering those days is
// imported. Update this if the plan's rate changes materially.
const EST_COST_PER_CALL = 0.326;

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
  callbacksTotal: number; // true total for the day (badge); `callbacks` is only the recent preview
  recovered: RecoveredRow[];
  recoveredTotal: number;
  recoveredValueEst: number; // rough estimated $ recovered (recoveredTotal × per-RO estimate)
  insights: CallInsights;
  appraisalsScheduled: number;   // said yes to a trade value today
  appraisalsWantOptions: number; // of those, how many agreed to be approached
  equityFunnel: EquityFunnel;
  equityRows: EquityRow[];
  lastUpdated: string | null;
}

// Claude-classified call insights for the day (Reid's #1/#2/#4/#5). Built from
// esther_call_classifications joined to the day's calls; unclassified calls fall
// back to their coarse tag intent so the donut still totals to all calls.
export interface CallInsights {
  intentDetail: IntentSlice[];
  transferReasons: { key: string; label: string; count: number; pct: number }[];
  humanRequested: number;
  callsConsidered: number; // denominator for human-preference (calls in scope/day)
  sentimentAvg: number | null;
  sentimentDeteriorated: number;
  sentimentSampled: number;
  classifiedShare: number; // 0..1 — how much of the day is classified yet
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getCallInsights(scopeIds: string[], date: string): Promise<CallInsights> {
  const sb = createServiceClient();
  const { data: calls } = await sb
    .from("esther_calls")
    .select("ghl_message_id,intent,transferred,department")
    .eq("local_date", date)
    .in("store_id", scopeIds)
    .not("tags", "cs", "{qa-line}"); // exclude QA/secret-shopper calls, like the rollup
  const rows = calls ?? [];
  const ids = rows.map((r) => r.ghl_message_id).filter(Boolean) as string[];

  const cls = new Map<string, { intent_detail: string | null; transfer_reason: string | null; human_requested: boolean | null; sentiment_open: number | null; sentiment_close: number | null }>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await sb
      .from("esther_call_classifications")
      .select("ghl_message_id,intent_detail,transfer_reason,human_requested,sentiment_open,sentiment_close")
      .in("ghl_message_id", ids.slice(i, i + 200));
    for (const c of data ?? []) cls.set(c.ghl_message_id, c);
  }

  const intentCounts: Record<string, number> = {};
  const reasonCounts: Record<string, number> = {};
  let humanRequested = 0, sentSum = 0, sentN = 0, deteriorated = 0, classified = 0;
  for (const r of rows) {
    const c = r.ghl_message_id ? cls.get(r.ghl_message_id) : undefined;
    if (c) classified++;
    const label = c?.intent_detail || (r.intent ? humanizeIntent(r.intent) : "Unknown");
    intentCounts[label] = (intentCounts[label] ?? 0) + 1;
    // Service transfers only (Reid's ask) — exclude sales hand-offs, matching the
    // rollup's `department is distinct from 'sales'`. Unclassified counts as service.
    if (r.transferred && r.department !== "sales") {
      const reason = c?.transfer_reason || "unknown";
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    }
    if (c?.human_requested) humanRequested++;
    if (c && c.sentiment_close != null) {
      sentSum += c.sentiment_close;
      sentN++;
      if (c.sentiment_open != null && c.sentiment_close < c.sentiment_open) deteriorated++;
    }
  }
  const total = rows.length;
  const intentDetail: IntentSlice[] = Object.entries(intentCounts)
    .map(([k, count]) => ({ key: k, label: k, count, pct: total ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
  const transferReasons = Object.entries(reasonCounts)
    .map(([k, count]) => ({ key: k, label: titleCase(k), count, pct: 0 }))
    .sort((a, b) => b.count - a.count);
  const rTotal = transferReasons.reduce((s, r) => s + r.count, 0);
  for (const r of transferReasons) r.pct = rTotal ? Math.round((r.count / rTotal) * 100) : 0;

  return {
    intentDetail,
    transferReasons,
    humanRequested,
    callsConsidered: total,
    sentimentAvg: sentN ? Math.round(sentSum / sentN) : null,
    sentimentDeteriorated: deteriorated,
    sentimentSampled: sentN,
    classifiedShare: total ? classified / total : 0,
  };
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
    // Weight each store's OWN rate by its eligible calls. Dividing
    // sum(appointments_booked) by sum(eligible_calls) mixes two different
    // populations: the rollup counts appointments_booked as every booked
    // contact, while eligible_calls counts only service/sales calls that
    // produced a transcript. On 18 Sep that put "Appointment Conversion Rate
    // 220.4%" in front of the owner — 119 bookings over 54 eligible calls.
    //
    // The rollup's own booking_pct already divides like-for-like (see the
    // booking_pct case in esther_ingest.rollup), so weighting those by
    // eligible_calls gives the true group rate and can never exceed 100.
    let weighted = 0;
    let elig = 0;
    for (const r of rows) {
      const pct = num(r, "booking_pct");
      const e = num(r, "eligible_calls") ?? 0;
      if (pct === null || e <= 0) continue;
      weighted += pct * e;
      elig += e;
    }
    return elig > 0 ? weighted / elig : null;
  }
  if (key === "containment_rate") {
    // weighted across stores: total contained ÷ total eligible (never an avg of %s)
    const contained = rows.reduce((s, r) => s + (num(r, "contained_calls") ?? 0), 0);
    const elig = rows.reduce((s, r) => s + (num(r, "eligible_calls") ?? 0), 0);
    return elig > 0 ? (contained / elig) * 100 : null;
  }
  if (key === "cost_per_booking") {
    // group value = total real AI spend ÷ total bookings (never an average of averages)
    const spendVals = rows.map((r) => num(r, "ai_spend")).filter((v): v is number => v !== null);
    if (!spendVals.length) return null; // no billing imported → awaiting, not $0
    const spend = spendVals.reduce((a, b) => a + b, 0);
    const bookings = rows.reduce((s, r) => s + (num(r, "appointments_booked") ?? 0), 0);
    return bookings > 0 ? spend / bookings : null;
  }
  if (SUM_KEYS.has(key)) {
    // sum only real values; if every row is null (e.g. no billing yet) return null
    // so the card shows "Awaiting data" instead of a fake 0.
    const vals = rows.map((r) => num(r, key)).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
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

  const [defsRes, curRes, prevRes, trendRes, cbRes, recRes, recValRes, qaRes,
         apprRes, apprPrevRes] = await Promise.all([
    sb.from("esther_metric_definitions").select("*").eq("enabled", true).order("sort_order"),
    sb.from("esther_daily_metrics").select("*").eq("local_date", date).in("store_id", scopeIds),
    sb.from("esther_daily_metrics").select("*").eq("local_date", prevDate).in("store_id", scopeIds),
    sb.from("esther_daily_metrics").select("store_id,local_date,total_calls,appointments_booked")
      .gte("local_date", start14Date).lte("local_date", date).in("store_id", scopeIds),
    // Only the recent 5 as a preview; the true total for the badge comes from
    // the rolled-up metric below, so the panel and the KPI card always agree.
    sb.from("esther_calls").select("started_at,intent,local_date,store_id")
      .eq("local_date", date).eq("callback_needed", true).in("store_id", scopeIds)
      .not("tags", "cs", "{qa-line}") // exclude QA/secret-shopper calls
      .order("started_at", { ascending: false }).limit(5),
    sb.from("esther_recovered_opportunities").select("*")
      .eq("local_date", date).in("store_id", scopeIds)
      .order("recovered_at", { ascending: false }).limit(5),
    // all recovered rows for the day (value only) — to sum the true recovered value
    sb.from("esther_recovered_opportunities").select("value")
      .eq("local_date", date).in("store_id", scopeIds),
    // Secret Shopper: the day's graded QA (qa-line) shop calls. QA runs from the
    // St. Charles account but shops the whole group, so this is a group-level metric.
    sb.from("esther_qa_scores").select("score").eq("local_date", date),
    // Appraisals Scheduled — read straight from the equity table, not the daily
    // rollup. Reid watches this while the customer is still in the lounge, so a
    // number that waits on the 15-minute ingest would be no use to him.
    sb.from("esther_equity_appraisals")
      .select("id,customer_name,vehicle,priority_score,priority_band," +
              "wants_options,claimed_by,outcome")
      .eq("local_date", date).in("store_id", scopeIds)
      .order("priority_score", { ascending: false, nullsFirst: false }),
    sb.from("esther_equity_appraisals").select("id")
      .eq("local_date", prevDate).in("store_id", scopeIds),
  ]);

  const defs = (defsRes.data ?? []) as MetricDefinition[];
  const cur = (curRes.data ?? []) as DM[];
  const prevRows = (prevRes.data ?? []) as DM[];

  // Secret Shopper Score = average of the day's graded QA shop calls (0–100), or
  // null when none graded yet (card shows "Awaiting data").
  const qaScores = ((qaRes.data ?? []) as { score: number | null }[])
    .map((r) => r.score).filter((s): s is number => s !== null);
  const qaAvg = qaScores.length
    ? Math.round(qaScores.reduce((a, b) => a + b, 0) / qaScores.length)
    : null;

  // Appraisals Scheduled — how many service customers said yes to a trade value.
  const appraisals = (apprRes.data ?? []) as unknown as EquityRow[];
  const appraisalsScheduled = appraisals.length;
  const appraisalsWantOptions = appraisals.filter((a) => a.wants_options).length;
  const appraisalsPrev = ((apprPrevRes.data ?? []) as { id: number }[]).length;

  // The accountability funnel. "claimed" counts anyone a salesperson took,
  // including the ones who then presented or sold -- a funnel that let later
  // stages fall out of earlier ones would read as leads going backwards.
  const equityFunnel: EquityFunnel = {
    scheduled: appraisalsScheduled,
    wantsOptions: appraisalsWantOptions,
    claimed: appraisals.filter((a) => a.claimed_by).length,
    presented: appraisals.filter(
      (a) => a.outcome === "presented" || a.outcome === "sold").length,
    sold: appraisals.filter((a) => a.outcome === "sold").length,
  };

  const buildMetric = (d: MetricDefinition): MetricValue => {
    const forced = AWAITING.has(d.key);
    let value = forced ? null : aggregate(cur, d.key);
    let previous = forced ? null : aggregate(prevRows, d.key);
    let estimated = false;

    // Secret Shopper Score comes from the QA grader (esther_qa_scores), not the
    // daily rollup — average of the day's shop-call grades.
    if (d.key === "secret_shopper_score") value = qaAvg;

    // Appraisals come from esther_equity_appraisals, same reasoning. Zero is a
    // real answer here, not missing data: on a day nobody said yes the card
    // should say 0, because "Awaiting data" would read as a broken feed.
    if (d.key === "appraisals_scheduled") {
      value = appraisalsScheduled;
      previous = appraisalsPrev;
    }

    // Spend cards: when a day has no imported billing yet (value null), fall back to
    // a LIVE estimate from call volume × the billed effective rate, clearly labeled.
    // Billed data always wins — importing the CSV replaces the estimate automatically.
    if (!forced && value === null && (d.key === "ai_spend" || d.key === "cost_per_booking")) {
      const calls = cur.reduce((s, r) => s + (num(r, "total_calls") ?? 0), 0);
      const bookings = cur.reduce((s, r) => s + (num(r, "appointments_booked") ?? 0), 0);
      const estSpend = calls > 0 ? calls * EST_COST_PER_CALL : null;
      value = d.key === "ai_spend"
        ? estSpend
        : (estSpend !== null && bookings > 0 ? estSpend / bookings : null);
      estimated = value !== null;
    }

    return {
      key: d.key,
      label: d.label,
      unit: d.unit,
      good_direction: d.good_direction,
      value,
      previous,
      awaiting: forced || value === null, // null data => "Awaiting data", never a fake 0
      estimated,
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
    // value is the estimated price of the service they booked (set at ingest from
    // the summary × the McGrath price book); null on days not yet re-rolled → "—".
    (r) => ({ time: r.recovered_at, intent: r.intent ? humanizeIntent(r.intent) : null, outcome: r.outcome ?? "Booked", value: r.value }),
  );

  // True recovered value = sum of each booking's estimated service price.
  const recoveredValueEst = ((recValRes.data ?? []) as { value: number | null }[])
    .reduce((s, r) => s + (r.value ?? 0), 0);

  const lastUpdated =
    cur.map((r) => r.updated_at as string).filter(Boolean).sort().pop() ?? null;

  const insights = await getCallInsights(scopeIds, date);

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
    callbacksTotal: aggregate(cur, "callbacks_needed") ?? 0,
    recovered,
    recoveredTotal: aggregate(cur, "recovered_count") ?? 0,
    recoveredValueEst,
    insights,
    appraisalsScheduled,
    appraisalsWantOptions,
    equityFunnel,
    equityRows: appraisals,
    lastUpdated,
  };
}
