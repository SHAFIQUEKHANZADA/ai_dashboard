import { requireTab } from "@/lib/auth";
import { PageTop, Tile } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { CallsBookingsTrend } from "@/components/charts/calls-bookings-trend";
import { resolveScope, defaultRange, getReport } from "@/lib/pages";

export const dynamic = "force-dynamic";

function shortName(name: string) {
  const n = name.replace(/^McGrath\s+/, "");
  const m = n.match(/^(Honda|Acura|Kia|Volvo|Audi)\s+of\s+(.+)$/i);
  return m ? `${m[2]} ${m[1]}` : n;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ store?: string; days?: string }> }) {
  await requireTab("/reports");
  const sp = await searchParams;
  const days = Number(sp.days) === 7 || Number(sp.days) === 30 ? Number(sp.days) : 14;
  const { stores, storeId, scopeIds } = await resolveScope(sp.store);
  const { from, to } = defaultRange(days);
  const r = await getReport(scopeIds, from, to);

  const trend = r.daily.map((d) => ({ local_date: d.local_date, total_calls: d.calls, appointments_booked: d.booked }));

  return (
    <>
      <PageTop
        title="Reports"
        subtitle={`Performance summary · ${from} → ${to}`}
        right={<StoreFilter stores={stores} store={storeId ?? "all"} />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tile label="Total Calls" value={r.totals.calls} tone="blue" />
        <Tile label="Booked" value={r.totals.booked} tone="green" />
        <Tile label="Transfers" value={r.totals.transfers} />
        <Tile label="Dropped" value={r.totals.dropped} tone="red" />
        <Tile label="Callbacks" value={r.totals.callbacks} tone="amber" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Store comparison" subtitle="Totals over the period">
          {r.perStore.length === 0 ? <EmptyState /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                    <th className="pb-2 font-semibold">Store</th>
                    <th className="pb-2 text-right font-semibold">Calls</th>
                    <th className="pb-2 text-right font-semibold">Booked</th>
                    <th className="pb-2 text-right font-semibold">Transfers</th>
                    <th className="pb-2 text-right font-semibold">Dropped</th>
                  </tr>
                </thead>
                <tbody>
                  {r.perStore.map((s) => (
                    <tr key={s.store.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 text-ink-soft">{shortName(s.store.name)}{!s.hasGhl && <span className="ml-1 text-[10px] text-muted">(no GHL)</span>}</td>
                      <td className="py-2.5 text-right font-semibold text-ink">{s.calls}</td>
                      <td className="py-2.5 text-right text-green">{s.booked}</td>
                      <td className="py-2.5 text-right text-ink-soft">{s.transfers}</td>
                      <td className="py-2.5 text-right text-red">{s.dropped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Customer Intent" subtitle="Why customers called">
          {r.intent.length === 0 ? <EmptyState /> : (
            <ul className="space-y-2">
              {r.intent.map((i) => (
                <li key={i.label} className="flex items-center gap-3 text-[13px]">
                  <span className="w-28 shrink-0 text-ink-soft">{i.label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted/12">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${i.pct}%` }} />
                  </span>
                  <span className="w-10 text-right font-semibold text-ink">{i.count}</span>
                  <span className="w-9 text-right text-muted">{i.pct}%</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Daily Calls & Bookings" subtitle={`Last ${days} days`} className="mt-4">
        <CallsBookingsTrend data={trend} />
      </Panel>
    </>
  );
}
