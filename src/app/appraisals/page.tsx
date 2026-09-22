import { Send, MessageSquare, ThumbsUp, Tag, Percent, ExternalLink } from "lucide-react";
import { requireTab } from "@/lib/auth";
import { PageTop } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { LiveRefresh } from "@/components/live-refresh";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { MetricTile, Funnel } from "@/components/metric-tile";
import { FilterTabs } from "@/components/filter-tabs";
import { SearchBox } from "@/components/search-box";
import { resolveScope, defaultRange, getAppraisals, type AppraisalRow } from "@/lib/pages";
import { fmtDateTime, fmtTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const OUTCOME: Record<string, { label: string; cls: string }> = {
  yes: { label: "Said yes", cls: "bg-green/10 text-green" },
  value_only: { label: "Wants the number", cls: "bg-blue/10 text-blue" },
  engaged: { label: "Replied", cls: "bg-amber/15 text-amber" },
  declined: { label: "Not interested", cls: "bg-muted/15 text-muted" },
  opted_out: { label: "Opted out", cls: "bg-red/10 text-red" },
  no_reply: { label: "No reply", cls: "bg-muted/10 text-muted" },
};

function initials(name: string | null) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** One customer's conversation, shown the way it reads on their phone — which
 *  is the point: Reid's complaint was that the threads are impossible to find
 *  inside GHL. Collapsed by default so the list stays scannable. */
function Thread({ r }: { r: AppraisalRow }) {
  const o = OUTCOME[r.outcome] ?? OUTCOME.no_reply;
  const replied = Boolean(r.replied_at);
  return (
    <details className="group rounded-xl border border-line bg-surface open:shadow-[var(--shadow)]">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
            replied ? "bg-green/10 text-green" : "bg-surface-2 text-muted"
          }`}
        >
          {initials(r.customer_name)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-ink">{r.customer_name || "Unknown"}</span>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${o.cls}`}>
              {o.label}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-muted">
            {r.reply_text ? (
              <span className="italic text-ink-soft">“{r.reply_text}”</span>
            ) : (
              "No reply yet"
            )}
          </span>
        </span>

        <span className="hidden shrink-0 text-right text-[11px] text-muted sm:block">
          <span className="block">{r.store}</span>
          {r.sent_at && <span className="block">sent {fmtTime(r.sent_at)}</span>}
        </span>
      </summary>

      <div className="space-y-2 border-t border-line px-3 pb-3 pt-3">
        {r.thread.map((m, i) => (
          <div key={i} className={`flex ${m.direction === "inbound" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                m.direction === "inbound"
                  ? "rounded-bl-sm bg-surface-2 text-ink"
                  : "rounded-br-sm bg-brand/10 text-ink"
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {m.direction === "inbound" ? r.customer_name || "Customer" : "Store"}
                {m.at && ` · ${fmtDateTime(m.at)}`}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-snug">{m.body}</p>
            </div>
          </div>
        ))}
        {r.ghl_url && (
          <a
            href={r.ghl_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand hover:underline"
          >
            Open in GoHighLevel <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </details>
  );
}

export default async function AppraisalsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; view?: string; q?: string }>;
}) {
  await requireTab("/appraisals");
  const sp = await searchParams;
  const { stores, storeId, scopeIds, names } = await resolveScope(sp.store);
  const { from, to } = defaultRange(14);
  const d = await getAppraisals(scopeIds, names, from, to);

  const view = sp.view ?? "all";
  const q = (sp.q ?? "").trim().toLowerCase();

  let list = d.rows;
  if (view === "replied") list = list.filter((r) => r.replied_at);
  else if (view === "yes") list = list.filter((r) => r.outcome === "yes" || r.outcome === "value_only");
  else if (view === "silent") list = list.filter((r) => !r.replied_at);
  if (q) list = list.filter((r) => (r.customer_name ?? "").toLowerCase().includes(q));

  const today = d.daily.length ? d.daily[d.daily.length - 1] : null;
  const sending = new Set(d.byStore.map((s) => s.store));
  const silentStores = stores.filter((s) => scopeIds.includes(s.id) && !sending.has(s.name));

  return (
    <>
      <PageTop
        title="Appraisals"
        subtitle="Trade-appraisal texts sent while customers are in for service"
        right={
          <>
            <LiveRefresh />
            <StoreFilter stores={stores} store={storeId ?? "all"} />
          </>
        }
      />

      <p className="-mt-2 mb-4 text-[14px] text-ink-soft">
        {d.sent === 0 ? (
          "No appraisal texts have gone out in this range."
        ) : (
          <>
            <strong className="text-ink">{d.sent} customers</strong> were texted over the last 14
            days. <strong className="text-ink">{d.replied}</strong> replied and{" "}
            <strong className="text-ink">{d.yes}</strong> said yes.
            {today && ` Most recently on ${today.date}: ${today.sent} texted, ${today.replied} replied.`}
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricTile icon={Send} tone="blue" label="Texts sent" value={d.sent} />
        <MetricTile
          icon={MessageSquare}
          tone={d.replied > 0 ? "amber" : "ink"}
          label="Replied"
          value={d.replied}
        />
        <MetricTile
          icon={ThumbsUp}
          tone={d.yes > 0 ? "green" : "ink"}
          label="Said yes"
          value={d.yes}
          caption="Agreed to an appraisal"
        />
        <MetricTile icon={Tag} tone="purple" label="Wants the number" value={d.valueOnly} />
        <MetricTile
          icon={Percent}
          tone={d.replyRate != null && d.replyRate >= 20 ? "green" : "red"}
          label="Reply rate"
          value={d.replyRate == null ? "—" : `${d.replyRate}%`}
        />
      </div>

      {silentStores.length > 0 && (
        <p className="mt-3 rounded-xl border border-amber/30 bg-amber/5 px-3 py-2 text-[12px] text-amber">
          No appraisal texts at all from {silentStores.map((s) => s.name).join(", ")} — the workflow
          may not be switched on there.
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="The funnel" subtitle="Last 14 days" className="lg:col-span-1">
          <Funnel
            stages={[
              { label: "Texted", value: d.sent, tone: "blue" },
              { label: "Replied", value: d.replied, tone: "amber" },
              { label: "Said yes", value: d.yes, tone: "green" },
            ]}
          />
          {d.byStore.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                By store
              </h4>
              <ul className="space-y-1.5">
                {d.byStore.map((s) => (
                  <li key={s.store} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate text-ink-soft">{s.store}</span>
                    <span className="shrink-0 font-semibold text-ink">
                      {s.replied}
                      <span className="text-muted">/{s.sent}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Day by day" subtitle="Sent, replied, and who said yes" className="lg:col-span-2">
          {d.daily.length === 0 ? (
            <EmptyState label="No days in range" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                    <th className="pb-2 font-semibold">Day</th>
                    <th className="pb-2 font-semibold">Sent</th>
                    <th className="pb-2 font-semibold">Replied</th>
                    <th className="pb-2 font-semibold">Said yes</th>
                    <th className="pb-2 font-semibold">Reply rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[...d.daily].reverse().map((day) => {
                    const pct = day.sent ? Math.round((day.replied / day.sent) * 100) : 0;
                    return (
                      <tr key={day.date} className="border-b border-line/60 last:border-0">
                        <td className="py-2 text-muted">{day.date}</td>
                        <td className="py-2 text-ink">{day.sent}</td>
                        <td className="py-2 text-ink">{day.replied}</td>
                        <td className="py-2 font-semibold text-ink">{day.yes}</td>
                        <td className="py-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                              pct >= 20 ? "bg-green/10 text-green" : "bg-red/10 text-red"
                            }`}
                          >
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold tracking-tight text-ink">Conversations</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox placeholder="Search by name…" />
          <FilterTabs
            base="/appraisals"
            active={view}
            keep={{ store: storeId ?? undefined, q: sp.q }}
            tabs={[
              { key: "all", label: "Everyone", count: d.rows.length },
              { key: "replied", label: "Replied", count: d.replied, tone: "amber" },
              { key: "yes", label: "Said yes", count: d.yes + d.valueOnly, tone: "green" },
              { key: "silent", label: "No reply", count: d.noReply },
            ]}
          />
        </div>
      </div>

      {list.length === 0 ? (
        <Panel title="" className="py-2">
          <EmptyState label={q ? `Nobody matching “${sp.q}”` : "Nothing here"} />
        </Panel>
      ) : (
        <div className="space-y-2">
          {list.slice(0, 200).map((r) => (
            <Thread key={`${r.ghl_contact_id}-${r.local_date}`} r={r} />
          ))}
        </div>
      )}
    </>
  );
}
