import { ShieldCheck, AlertTriangle, TriangleAlert, PhoneCall, Quote } from "lucide-react";
import { requireTab } from "@/lib/auth";
import { PageTop } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { LiveRefresh } from "@/components/live-refresh";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { MetricTile } from "@/components/metric-tile";
import { FilterTabs } from "@/components/filter-tabs";
import { resolveScope, defaultRange, getCallQuality, type AuditRow } from "@/lib/pages";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// Plain English for the failure codes. The codes are the contract between the
// auditor and this page; one added there without a label here still renders,
// just unprettified.
const LABEL: Record<string, string> = {
  invented_service: "Invented a service",
  wrong_concern_recorded: "Wrong concern recorded",
  wrong_vehicle_confirmed: "Wrong vehicle confirmed",
  closed_mid_call: "Hung up too early",
  wait_on_dropoff_only: "Waiter on drop-off-only job",
  quoted_duration: "Quoted a duration",
  slot_loop: "Repeated the same times",
  booking_not_confirmed: "Booking not confirmed",
  transfer_never_landed: "Transfer may not have landed",
  greeting_repeated: "Greeting repeated",
  reasoning_spoken_aloud: "Said its reasoning out loud",
  admitted_limits: "Told caller it couldn't help",
  contact_asked_twice: "Asked for details twice",
  stacked_questions: "Asked two things at once",
  coached_with_examples: "Coached the caller",
  mispronounced_brand: "Mispronounced the name",
  over_talking: "Talked over the caller",
  ignored_caller: "Ignored the caller",
};

const label = (code: string) => LABEL[code] ?? code.replace(/_/g, " ");

function mmss(sec?: number) {
  if (sec == null) return null;
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** One flagged call. The quote is the point — it is what lets someone judge the
 *  verdict without pulling the recording. */
function Finding({ r }: { r: AuditRow }) {
  const critical = r.severity === "critical";
  return (
    <article
      className={`rounded-xl border border-line bg-surface p-3.5 border-l-[3px] ${
        critical ? "border-l-red" : "border-l-amber"
      }`}
    >
      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-[13px] font-bold text-ink">{r.store}</span>
        <span className="text-[12px] text-muted">{fmtDateTime(r.audited_at)}</span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {r.failures.map((c) => (
            <span
              key={c}
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                critical ? "bg-red/10 text-red" : "bg-amber/15 text-amber"
              }`}
            >
              {label(c)}
            </span>
          ))}
        </span>
      </header>

      {r.headline && <p className="mt-2 text-[13px] leading-snug text-ink-soft">{r.headline}</p>}

      <div className="mt-2.5 space-y-1.5">
        {r.detail.map((f, i) =>
          f.quote ? (
            <div key={i} className="rounded-lg bg-surface-2 px-3 py-2">
              <div className="flex items-start gap-2">
                <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                <div className="min-w-0">
                  <p className="text-[13px] italic leading-snug text-ink">“{f.quote}”</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {mmss(f.at_sec) && <span className="font-semibold">{mmss(f.at_sec)} · </span>}
                    {f.why}
                  </p>
                </div>
              </div>
            </div>
          ) : null,
        )}
      </div>

      {r.confidence != null && (
        <footer className="mt-2 text-[11px] text-muted">
          {Math.round(r.confidence * 100)}% confident
        </footer>
      )}
    </article>
  );
}

export default async function CallQualityPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; view?: string }>;
}) {
  await requireTab("/call-quality");
  const sp = await searchParams;
  const { stores, storeId, scopeIds, names } = await resolveScope(sp.store);
  const { from, to } = defaultRange(14);
  const d = await getCallQuality(scopeIds, names, from, to);

  const view = sp.view ?? "attention";
  const list =
    view === "warnings" ? d.warn : view === "all" ? [...d.critical, ...d.warn] : d.critical;

  const latest = d.daily.length ? d.daily[d.daily.length - 1] : null;

  return (
    <>
      <PageTop
        title="Call Quality"
        subtitle="Every call is read and checked against Esther's script"
        right={
          <>
            <LiveRefresh />
            <StoreFilter stores={stores} store={storeId ?? "all"} />
          </>
        }
      />

      {/* The answer in one sentence, before any numbers. */}
      <p className="-mt-2 mb-4 text-[14px] text-ink-soft">
        {d.audited === 0 ? (
          "No calls have been checked yet."
        ) : (
          <>
            <strong className="text-ink">{d.audited} calls</strong> checked over the last 14 days.{" "}
            <strong className="text-ink">{d.critical.length}</strong>{" "}
            {d.critical.length === 1 ? "needs" : "need"} attention.
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricTile
          icon={ShieldCheck}
          tone={d.cleanRate != null && d.cleanRate >= 90 ? "green" : "amber"}
          label="Clean calls"
          value={d.cleanRate == null ? "—" : `${d.cleanRate}%`}
          caption={latest ? `${latest.pct}% on ${latest.date}` : undefined}
        />
        <MetricTile
          icon={AlertTriangle}
          tone="red"
          label="Needs attention"
          value={d.critical.length}
          caption="Would have lost the customer"
        />
        <MetricTile
          icon={TriangleAlert}
          tone="amber"
          label="Warnings"
          value={d.warn.length}
          caption="Clumsy, but still served"
        />
        <MetricTile
          icon={PhoneCall}
          tone="blue"
          label="Calls checked"
          value={d.audited}
          caption={d.notAudited > 0 ? `${d.notAudited} could not be checked` : "All calls covered"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Most common problems" subtitle="Last 14 days" className="lg:col-span-1">
          {d.byCode.length === 0 ? (
            <EmptyState label="Nothing flagged" />
          ) : (
            <ul className="space-y-2.5">
              {d.byCode.slice(0, 8).map((c) => {
                const pct = d.audited ? Math.round((c.count / d.audited) * 100) : 0;
                return (
                  <li key={c.code}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="text-[13px] text-ink-soft">{label(c.code)}</span>
                      <span className="text-[13px] font-bold text-ink">{c.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-brand/70" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Clean rate by day" subtitle="Higher is better" className="lg:col-span-2">
          {d.daily.length === 0 ? (
            <EmptyState label="No calls checked yet" />
          ) : (
            <div className="flex h-40 items-end gap-2">
              {d.daily.map((day) => (
                <div key={day.date} className="group flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-bold text-ink opacity-0 transition-opacity group-hover:opacity-100">
                    {day.pct}%
                  </span>
                  <div
                    className={`w-full rounded-lg transition-opacity hover:opacity-80 ${
                      day.pct >= 90 ? "bg-green" : day.pct >= 75 ? "bg-amber" : "bg-red"
                    }`}
                    style={{ height: `${Math.max(day.pct, 3)}%` }}
                    title={`${day.date}: ${day.pct}% clean (${day.ok} of ${day.total})`}
                  />
                  <span className="text-[10px] text-muted">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold tracking-tight text-ink">Flagged calls</h2>
        <FilterTabs
          base="/call-quality"
          active={view}
          keep={{ store: storeId ?? undefined }}
          tabs={[
            { key: "attention", label: "Needs attention", count: d.critical.length, tone: "red" },
            { key: "warnings", label: "Warnings", count: d.warn.length, tone: "amber" },
            { key: "all", label: "All", count: d.critical.length + d.warn.length },
          ]}
        />
      </div>

      {list.length === 0 ? (
        <Panel title="" className="py-2">
          <EmptyState label={view === "warnings" ? "No warnings" : "Nothing needs attention"} />
        </Panel>
      ) : (
        <div className="space-y-2.5">
          {list.slice(0, 50).map((r) => (
            <Finding key={r.ghl_message_id} r={r} />
          ))}
        </div>
      )}

      {d.notAudited > 0 && (
        // Stated plainly rather than hidden: these are excluded from the clean
        // rate, and a rising number means the check is seeing less than it appears to.
        <p className="mt-4 text-[12px] text-muted">
          {d.notAudited} {d.notAudited === 1 ? "call was" : "calls were"} not checked — too short, or
          the speakers could not be told apart. They are left out of the clean rate rather than
          counted as passing.
        </p>
      )}
    </>
  );
}
