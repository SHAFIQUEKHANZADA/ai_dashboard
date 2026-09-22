import { requireTab } from "@/lib/auth";
import { PageTop, Tile } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { LiveRefresh } from "@/components/live-refresh";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { resolveScope, defaultRange, getCalls } from "@/lib/pages";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const OUTCOME: Record<string, { label: string; cls: string }> = {
  booked: { label: "Booked", cls: "bg-green/10 text-green" },
  dropped: { label: "Dropped", cls: "bg-red/10 text-red" },
  callback_needed: { label: "Callback", cls: "bg-amber/15 text-amber" },
  info_only: { label: "Info only", cls: "bg-blue/10 text-blue" },
  no_transcript: { label: "No transcript", cls: "bg-muted/15 text-muted" },
};

export default async function CallAnalyticsPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  await requireTab("/call-analytics");
  const sp = await searchParams;
  const { stores, storeId, scopeIds, names } = await resolveScope(sp.store);
  const { from, to } = defaultRange(14);
  const data = await getCalls(scopeIds, names, from, to);

  return (
    <>
      <PageTop
        title="Call Analytics"
        subtitle={`Every call Esther handled · last 14 days`}
        right={<><LiveRefresh /><StoreFilter stores={stores} store={storeId ?? "all"} /></>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Tile label="Total Calls" value={data.total} tone="blue" />
        <Tile label="Booked" value={data.byOutcome["booked"] ?? 0} tone="green" />
        <Tile label="Transferred" value={data.transferred} />
        <Tile label="Dropped" value={data.byOutcome["dropped"] ?? 0} tone="red" />
        <Tile label="Callbacks" value={data.callbacks} tone="amber" />
        <Tile label="Info only" value={data.byOutcome["info_only"] ?? 0} />
      </div>

      <Panel title="Recent calls" subtitle="Newest first · latest 300 shown (tiles above cover the full 14 days)" className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState label="No calls in range" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">When</th>
                  <th className="pb-2 font-semibold">Store</th>
                  <th className="pb-2 font-semibold">Dept</th>
                  <th className="pb-2 font-semibold">Intent</th>
                  <th className="pb-2 font-semibold">Outcome</th>
                  <th className="pb-2 font-semibold">Flags</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 100).map((r) => {
                  const o = r.outcome ? OUTCOME[r.outcome] : null;
                  return (
                    <tr key={r.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 text-muted">{fmtDateTime(r.started_at)}</td>
                      <td className="py-2.5 text-ink-soft">{r.store}</td>
                      <td className="py-2.5 text-ink-soft capitalize">{r.department ?? "—"}</td>
                      <td className="py-2.5 text-ink-soft">{r.intent ?? "—"}</td>
                      <td className="py-2.5">
                        {o ? <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${o.cls}`}>{o.label}</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="py-2.5 text-[11px] text-muted">
                        {[r.transferred && "transferred", r.callback_needed && "callback"].filter(Boolean).join(" · ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
