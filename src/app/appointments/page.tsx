import { PageTop, Tile } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { LiveRefresh } from "@/components/live-refresh";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { resolveScope, defaultRange, getAppointments } from "@/lib/pages";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const SOURCE: Record<string, { label: string; cls: string }> = {
  ai: { label: "Esther (API)", cls: "bg-green/10 text-green" },
  dms: { label: "DMS", cls: "bg-blue/10 text-blue" },
  online: { label: "Online", cls: "bg-purple/10 text-purple" },
};

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ store?: string; source?: string }> }) {
  const sp = await searchParams;
  const { stores, storeId, scopeIds, names } = await resolveScope(sp.store);
  const { from, to } = defaultRange(14);
  const data = await getAppointments(scopeIds, names, from, to, sp.source);

  return (
    <>
      <PageTop
        title="Appointments"
        subtitle="Booked appointments from myKaarma · last 14 days"
        right={<><LiveRefresh /><StoreFilter stores={stores} store={storeId ?? "all"} /></>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Total appointments" value={data.total} />
        <Tile label="Esther (API)" value={data.bySource["ai"] ?? 0} tone="green" />
        <Tile label="DMS" value={data.bySource["dms"] ?? 0} tone="blue" />
        <Tile label="Online" value={data.bySource["online"] ?? 0} />
      </div>

      <Panel title="Appointments" subtitle="Newest first" className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState label="No appointments in range" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">Appointment</th>
                  <th className="pb-2 font-semibold">Store</th>
                  <th className="pb-2 font-semibold">Customer</th>
                  <th className="pb-2 font-semibold">Vehicle</th>
                  <th className="pb-2 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.slice(0, 120).map((r) => {
                  const s = SOURCE[r.source] ?? { label: r.source, cls: "bg-muted/15 text-muted" };
                  return (
                    <tr key={r.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2.5 text-muted">{fmtDateTime(r.start_time)}</td>
                      <td className="py-2.5 text-ink-soft">{r.store}</td>
                      <td className="py-2.5 text-ink-soft">{r.customer_name ?? "—"}</td>
                      <td className="py-2.5 text-ink-soft">{r.vehicle ?? "—"}</td>
                      <td className="py-2.5"><span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span></td>
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
