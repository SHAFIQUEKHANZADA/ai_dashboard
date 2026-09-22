import { createServiceClient } from "@/lib/supabase/server";
import { getStores } from "@/lib/data";
import { getSessionUser, getAccessibleStores } from "@/lib/auth";
import { humanizeIntent } from "@/lib/format";
import type { Store } from "@/lib/types";

// Shared scope resolution for the secondary pages — respects the signed-in user's
// role and store grants (a 'store' member can never widen scope past their stores).
export async function resolveScope(storeParam?: string) {
  const user = await getSessionUser();
  const stores = user ? await getAccessibleStores(user) : await getStores();
  const ids = stores.map((s) => s.id);
  const canSeeGroup = user ? user.canSeeGroup : true;
  const storeId = storeParam && ids.includes(storeParam)
    ? storeParam
    : canSeeGroup ? null : (ids[0] ?? null); // store users default to their first store
  const scopeIds = storeId ? [storeId] : ids;
  return { stores, storeId, scopeIds, canSeeGroup, user, names: new Map(stores.map((s) => [s.id, s.name])) };
}

export function defaultRange(days = 14) {
  const tz = "America/Chicago";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const from = new Date(today + "T00:00:00Z");
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to: today };
}

export interface CallRow {
  id: string;
  started_at: string;
  store: string;
  department: string | null;
  intent: string | null;
  outcome: string | null;
  transferred: boolean;
  callback_needed: boolean;
  tags: string[];
  ghl_url: string | null;
}

export async function getCalls(scopeIds: string[], names: Map<string, string>, from: string, to: string) {
  const sb = createServiceClient();
  const stores = await getStores();
  const locs = new Map(stores.map((s) => [s.id, s.ghl_location_id]));
  const { data } = await sb
    .from("esther_calls")
    .select("id,started_at,store_id,department,intent,outcome,transferred,callback_needed,tags,ghl_contact_id")
    .in("store_id", scopeIds)
    .gte("local_date", from)
    .lte("local_date", to)
    .order("started_at", { ascending: false })
    .limit(300);
  const rows: CallRow[] = (data ?? []).map((r) => ({
    id: r.id,
    started_at: r.started_at,
    store: names.get(r.store_id) ?? "—",
    department: r.department,
    intent: r.intent ? humanizeIntent(r.intent) : null,
    outcome: r.outcome,
    transferred: r.transferred,
    callback_needed: r.callback_needed,
    tags: r.tags ?? [],
    ghl_url: ghlContactUrl(locs.get(r.store_id) ?? null, r.ghl_contact_id),
  }));
  const by = (key: keyof CallRow) => {
    const m: Record<string, number> = {};
    for (const r of rows) {
      const v = (r[key] as string) || "unknown";
      m[v] = (m[v] ?? 0) + 1;
    }
    return m;
  };
  return {
    rows,
    total: rows.length,
    byOutcome: by("outcome"),
    byDept: by("department"),
    transferred: rows.filter((r) => r.transferred).length,
    callbacks: rows.filter((r) => r.callback_needed).length,
  };
}

// ── Metric drill-down: the actual calls behind a number, linkable into GHL ──
export const DRILLABLE = ["transfers", "failed_transfers", "dropped_calls", "callbacks_needed", "recovered_count"] as const;
export type DrillMetric = (typeof DRILLABLE)[number];

export const METRIC_LABEL: Record<DrillMetric, string> = {
  transfers: "Transfers",
  failed_transfers: "Failed Transfers",
  dropped_calls: "Dropped Calls",
  callbacks_needed: "Callbacks Needed",
  recovered_count: "Recovered Opportunities",
};

const RECOVERED_TAGS = ["dropped", "callback-needed", "needs-attention"];

export function isDrillMetric(x: string | undefined): x is DrillMetric {
  return !!x && (DRILLABLE as readonly string[]).includes(x);
}

// GHL/Zenvyk deep link to the contact, so any number is verifiable at the source.
export function ghlContactUrl(locationId: string | null, contactId: string | null): string | null {
  if (!locationId || !contactId) return null;
  return `https://app.zenvyk.com/v2/location/${locationId}/contacts/detail/${contactId}`;
}

export interface DrillRow {
  id: string;
  started_at: string;
  store: string;
  intent: string | null;
  outcome: string | null;
  tags: string[];
  ghl_url: string | null;
}

export async function getMetricCalls(metric: DrillMetric, scopeIds: string[], date: string) {
  const sb = createServiceClient();
  const stores = await getStores();
  const names = new Map(stores.map((s) => [s.id, s.name]));
  const locs = new Map(stores.map((s) => [s.id, s.ghl_location_id]));

  let q = sb
    .from("esther_calls")
    .select("id,started_at,store_id,intent,outcome,tags,transfer_succeeded,ghl_contact_id")
    .in("store_id", scopeIds)
    .eq("local_date", date)
    .order("started_at", { ascending: false })
    .limit(500);

  if (metric === "transfers") q = q.eq("transferred", true);
  else if (metric === "failed_transfers") q = q.eq("transferred", true).eq("transfer_succeeded", false);
  else if (metric === "dropped_calls") q = q.eq("outcome", "dropped");
  else if (metric === "callbacks_needed") q = q.eq("callback_needed", true);
  else if (metric === "recovered_count") q = q.eq("outcome", "booked").overlaps("tags", RECOVERED_TAGS);

  const { data } = await q;
  const rows: DrillRow[] = (data ?? []).map((r) => ({
    id: r.id,
    started_at: r.started_at,
    store: names.get(r.store_id) ?? "—",
    intent: r.intent ? humanizeIntent(r.intent) : null,
    outcome: r.outcome,
    tags: r.tags ?? [],
    ghl_url: ghlContactUrl(locs.get(r.store_id) ?? null, r.ghl_contact_id),
  }));
  return { rows, label: METRIC_LABEL[metric] };
}

export interface ApptRow {
  id: string;
  start_time: string;
  local_date: string;
  store: string;
  customer_name: string | null;
  vehicle: string | null;
  service: string | null;
  source: string;
}

export async function getAppointments(scopeIds: string[], names: Map<string, string>, from: string, to: string, source?: string) {
  const sb = createServiceClient();
  let q = sb
    .from("esther_appointments")
    .select("id,start_time,local_date,store_id,customer_name,vehicle,service,source")
    .in("store_id", scopeIds)
    .gte("local_date", from)
    .lte("local_date", to)
    .order("start_time", { ascending: false })
    .limit(300);
  if (source) q = q.eq("source", source);
  const { data } = await q;
  const rows: ApptRow[] = (data ?? []).map((r) => ({
    id: r.id,
    start_time: r.start_time,
    local_date: r.local_date,
    store: names.get(r.store_id) ?? "—",
    customer_name: r.customer_name,
    vehicle: r.vehicle,
    service: r.service,
    source: r.source,
  }));
  const bySource: Record<string, number> = {};
  for (const r of rows) bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  return { rows, total: rows.length, bySource };
}

// ── Esther's own bookings, split by department ──────────────
// Service = real myKaarma appointments Esther booked (source='ai').
// Sales   = calls Esther booked in the sales department (myKaarma has no
//           sales appointments, so these come from the call outcome itself).
export interface EstherServiceRow {
  id: string;
  start_time: string;
  store: string;
  customer_name: string | null;
  vehicle: string | null;
  service: string | null;
  value: number | null;
}
export interface EstherSalesRow {
  id: string;
  started_at: string;
  store: string;
  intent: string | null;
  summary: string | null;
  ghl_url: string | null;
}

export async function getEstherBookings(
  scopeIds: string[],
  names: Map<string, string>,
  from: string,
  to: string,
) {
  const sb = createServiceClient();
  const stores = await getStores();
  const locs = new Map(stores.map((s) => [s.id, s.ghl_location_id]));

  const [{ data: appts }, { data: calls }, { data: allSrc }] = await Promise.all([
    sb
      .from("esther_appointments")
      .select("id,start_time,store_id,customer_name,vehicle,service,estimated_value")
      .in("store_id", scopeIds)
      .eq("source", "ai")
      .gte("local_date", from)
      .lte("local_date", to)
      .order("start_time", { ascending: false })
      .limit(300),
    sb
      .from("esther_calls")
      .select("id,started_at,store_id,intent,summary,ghl_contact_id")
      .in("store_id", scopeIds)
      .eq("department", "sales")
      .eq("outcome", "booked")
      .gte("local_date", from)
      .lte("local_date", to)
      .order("started_at", { ascending: false })
      .limit(200),
    // full myKaarma source mix (all sources) for the context line
    sb
      .from("esther_appointments")
      .select("source")
      .in("store_id", scopeIds)
      .gte("local_date", from)
      .lte("local_date", to),
  ]);

  const service: EstherServiceRow[] = (appts ?? []).map((r) => ({
    id: r.id,
    start_time: r.start_time,
    store: names.get(r.store_id) ?? "—",
    customer_name: r.customer_name,
    vehicle: r.vehicle,
    service: r.service,
    value: r.estimated_value != null ? Number(r.estimated_value) : null,
  }));
  const sales: EstherSalesRow[] = (calls ?? []).map((r) => ({
    id: r.id,
    started_at: r.started_at,
    store: names.get(r.store_id) ?? "—",
    intent: r.intent,
    summary: r.summary,
    ghl_url: ghlContactUrl(locs.get(r.store_id) ?? null, r.ghl_contact_id),
  }));

  const totalValue = service.reduce((s, r) => s + (r.value ?? 0), 0);
  const bySource: Record<string, number> = {};
  for (const r of allSrc ?? []) bySource[r.source] = (bySource[r.source] ?? 0) + 1;

  return { service, sales, totalValue, bySource };
}

export interface StoreSummary {
  store: Store;
  calls: number;
  booked: number;
  transfers: number;
  dropped: number;
  callbacks: number;
  hasGhl: boolean;
}

export async function getStoreSummaries(from: string, to: string): Promise<StoreSummary[]> {
  const sb = createServiceClient();
  const stores = await getStores();
  const { data } = await sb
    .from("esther_daily_metrics")
    .select("store_id,total_calls,appointments_booked,transfers,dropped_calls,callbacks_needed")
    .gte("local_date", from)
    .lte("local_date", to);
  const agg = new Map<string, { calls: number; booked: number; transfers: number; dropped: number; callbacks: number }>();
  for (const r of data ?? []) {
    const a = agg.get(r.store_id) ?? { calls: 0, booked: 0, transfers: 0, dropped: 0, callbacks: 0 };
    a.calls += r.total_calls ?? 0;
    a.booked += r.appointments_booked ?? 0;
    a.transfers += r.transfers ?? 0;
    a.dropped += r.dropped_calls ?? 0;
    a.callbacks += r.callbacks_needed ?? 0;
    agg.set(r.store_id, a);
  }
  return stores.map((store) => {
    const a = agg.get(store.id) ?? { calls: 0, booked: 0, transfers: 0, dropped: 0, callbacks: 0 };
    return { store, ...a, hasGhl: !!store.ghl_location_id };
  });
}

export interface ReportData {
  perStore: StoreSummary[];
  intent: { label: string; count: number; pct: number }[];
  daily: { local_date: string; calls: number; booked: number; transfers: number }[];
  totals: { calls: number; booked: number; transfers: number; dropped: number; callbacks: number };
}

export async function getReport(scopeIds: string[], from: string, to: string): Promise<ReportData> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("esther_daily_metrics")
    .select("store_id,local_date,total_calls,appointments_booked,transfers,dropped_calls,callbacks_needed,intent_breakdown")
    .in("store_id", scopeIds)
    .gte("local_date", from)
    .lte("local_date", to);
  const rows = data ?? [];
  const intentTotals: Record<string, number> = {};
  const dailyMap = new Map<string, { local_date: string; calls: number; booked: number; transfers: number }>();
  const totals = { calls: 0, booked: 0, transfers: 0, dropped: 0, callbacks: 0 };
  for (const r of rows) {
    totals.calls += r.total_calls ?? 0;
    totals.booked += r.appointments_booked ?? 0;
    totals.transfers += r.transfers ?? 0;
    totals.dropped += r.dropped_calls ?? 0;
    totals.callbacks += r.callbacks_needed ?? 0;
    const ib = (r.intent_breakdown as Record<string, number>) ?? {};
    for (const [k, v] of Object.entries(ib)) intentTotals[k] = (intentTotals[k] ?? 0) + Number(v);
    const d = dailyMap.get(r.local_date) ?? { local_date: r.local_date, calls: 0, booked: 0, transfers: 0 };
    d.calls += r.total_calls ?? 0;
    d.booked += r.appointments_booked ?? 0;
    d.transfers += r.transfers ?? 0;
    dailyMap.set(r.local_date, d);
  }
  const intentSum = Object.values(intentTotals).reduce((a, b) => a + b, 0);
  const intent = Object.entries(intentTotals)
    .map(([k, count]) => ({ label: humanizeIntent(k), count, pct: intentSum ? Math.round((count / intentSum) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.local_date.localeCompare(b.local_date));
  const perStore = await getStoreSummaries(from, to);
  return { perStore: perStore.filter((s) => scopeIds.includes(s.store.id)), intent, daily, totals };
}

// ── Call Quality: the drift audit (esther_call_audits) ────────────────────
// Every call is judged against Esther's own script by Claude and stored once,
// keyed by ghl_message_id. Severity is the alerting contract: `critical` is a
// failure that loses the customer, `warn` is clumsy but survivable. Rows with
// severity `unlabelled` or `too_short` were deliberately NOT audited — they are
// counted separately so the clean-rate denominator stays honest rather than
// quietly shrinking.

export const NOT_AUDITED = ["unlabelled", "too_short"];

export interface AuditRow {
  ghl_message_id: string;
  store: string;
  audited_at: string;
  severity: string;
  failures: string[];
  headline: string | null;
  confidence: number | null;
  detail: { code: string; quote?: string; at_sec?: number; why?: string }[];
  ghl_url: string | null;
}

export async function getCallQuality(
  scopeIds: string[], names: Map<string, string>, from: string, to: string,
) {
  const sb = createServiceClient();
  const stores = await getStores();
  const locs = new Map(stores.map((s) => [s.id, s.ghl_location_id]));

  const { data } = await sb
    .from("esther_call_audits")
    .select("ghl_message_id,store_id,local_date,audited_at,severity,failures,detail,headline,confidence")
    .in("store_id", scopeIds)
    .gte("local_date", from)
    .lte("local_date", to)
    .order("audited_at", { ascending: false })
    .limit(500);

  const all = data ?? [];
  const rows: AuditRow[] = all.map((r) => ({
    ghl_message_id: r.ghl_message_id,
    store: names.get(r.store_id) ?? "—",
    audited_at: r.audited_at,
    severity: r.severity ?? "ok",
    failures: r.failures ?? [],
    headline: r.headline,
    confidence: r.confidence,
    detail: Array.isArray(r.detail) ? r.detail : [],
    // The audit is keyed by message id, but GHL links by contact; the call list
    // already carries that, so leave this null rather than inventing a URL.
    ghl_url: ghlContactUrl(locs.get(r.store_id) ?? null, null),
  }));

  const judged = rows.filter((r) => !NOT_AUDITED.includes(r.severity));
  const critical = judged.filter((r) => r.severity === "critical");
  const warn = judged.filter((r) => r.severity === "warn");
  const clean = judged.filter((r) => r.severity === "ok");

  // Which problems are most common — the pattern Reid can act on, rather than
  // one-off incidents.
  const codes: Record<string, number> = {};
  for (const r of judged) for (const c of r.failures) codes[c] = (codes[c] ?? 0) + 1;
  const byCode = Object.entries(codes)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);

  // Clean rate per day, so a regression shows as a trend and not just a number.
  const dayMap = new Map<string, { date: string; ok: number; total: number }>();
  for (const r of all) {
    if (NOT_AUDITED.includes(r.severity ?? "")) continue;
    const d = r.local_date as string;
    const e = dayMap.get(d) ?? { date: d, ok: 0, total: 0 };
    e.total += 1;
    if (r.severity === "ok") e.ok += 1;
    dayMap.set(d, e);
  }
  const daily = Array.from(dayMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, pct: d.total ? Math.round((d.ok / d.total) * 100) : 0 }));

  return {
    rows,
    critical,
    warn,
    audited: judged.length,
    cleanRate: judged.length ? Math.round((clean.length / judged.length) * 100) : null,
    notAudited: rows.length - judged.length,
    byCode,
    daily,
  };
}

// ── Appraisals: the trade-appraisal texts and what came back ──────────────
// Reid, 22 Sep: "It's hard to find the conversations and if we had 100 come in
// today how many got the message". The send happens inside GHL, so
// esther_equity_messages is the only record that a text went out at all —
// esther_equity_appraisals holds just the people who said yes.

export interface ThreadMsg { at: string; direction: "inbound" | "outbound"; body: string }

export interface AppraisalRow {
  ghl_contact_id: string;
  store: string;
  local_date: string;
  customer_name: string | null;
  sent_at: string | null;
  replied_at: string | null;
  reply_text: string | null;
  outcome: string;
  thread: ThreadMsg[];
  ghl_url: string | null;
}

export async function getAppraisals(
  scopeIds: string[], names: Map<string, string>, from: string, to: string,
) {
  const sb = createServiceClient();
  const stores = await getStores();
  const locs = new Map(stores.map((s) => [s.id, s.ghl_location_id]));

  const { data } = await sb
    .from("esther_equity_messages")
    .select("ghl_contact_id,store_id,local_date,customer_name,sent_at,replied_at,reply_text,outcome,thread")
    .in("store_id", scopeIds)
    .gte("local_date", from)
    .lte("local_date", to)
    .order("sent_at", { ascending: false })
    .limit(500);

  const rows: AppraisalRow[] = (data ?? []).map((r) => ({
    ghl_contact_id: r.ghl_contact_id,
    store: names.get(r.store_id) ?? "—",
    local_date: r.local_date,
    customer_name: r.customer_name,
    sent_at: r.sent_at,
    replied_at: r.replied_at,
    reply_text: r.reply_text,
    outcome: r.outcome ?? "no_reply",
    thread: Array.isArray(r.thread) ? (r.thread as ThreadMsg[]) : [],
    ghl_url: ghlContactUrl(locs.get(r.store_id) ?? null, r.ghl_contact_id),
  }));

  const count = (o: string) => rows.filter((r) => r.outcome === o).length;
  const replied = rows.filter((r) => r.replied_at).length;
  // "Yes" is the one that puts a salesperson in front of a customer. value_only
  // is a softer yes (wants the number, not the conversation) and is kept
  // separate rather than folded in — merging them would overstate the result
  // Reid is actually measuring.
  const yes = count("yes");

  // Sent vs replied per day, so the trend is visible and not just today.
  const dayMap = new Map<string, { date: string; sent: number; replied: number; yes: number }>();
  for (const r of rows) {
    const e = dayMap.get(r.local_date) ?? { date: r.local_date, sent: 0, replied: 0, yes: 0 };
    e.sent += 1;
    if (r.replied_at) e.replied += 1;
    if (r.outcome === "yes") e.yes += 1;
    dayMap.set(r.local_date, e);
  }
  const daily = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // Which stores are actually running this. A store with zero is not a quiet
  // zero — it means the workflow is not live there, which is worth seeing.
  const byStore = new Map<string, { store: string; sent: number; replied: number }>();
  for (const r of rows) {
    const e = byStore.get(r.store) ?? { store: r.store, sent: 0, replied: 0 };
    e.sent += 1;
    if (r.replied_at) e.replied += 1;
    byStore.set(r.store, e);
  }

  return {
    rows,
    sent: rows.length,
    replied,
    yes,
    valueOnly: count("value_only"),
    declined: count("declined"),
    optedOut: count("opted_out"),
    noReply: count("no_reply"),
    replyRate: rows.length ? Math.round((replied / rows.length) * 100) : null,
    daily,
    byStore: Array.from(byStore.values()).sort((a, b) => b.sent - a.sent),
  };
}
