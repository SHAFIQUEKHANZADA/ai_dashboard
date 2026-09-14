import { ExternalLink, Wrench, Handshake } from "lucide-react";
import { requireTab } from "@/lib/auth";
import { PageTop, Tile } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { LiveRefresh } from "@/components/live-refresh";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { resolveScope, defaultRange, getEstherBookings } from "@/lib/pages";
import { fmtDateTime, humanizeIntent } from "@/lib/format";

export const dynamic = "force-dynamic";

function CountPill({ n, tone }: { n: number; tone: "blue" | "amber" }) {
  const cls = tone === "blue" ? "bg-blue/10 text-blue" : "bg-amber/15 text-amber";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{n}</span>;
}

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  await requireTab("/appointments");
  const sp = await searchParams;
  const { stores, storeId, scopeIds, names } = await resolveScope(sp.store);
  const { from, to } = defaultRange(14);
  const { service, sales, bySource } = await getEstherBookings(scopeIds, names, from, to);

  const multiStore = !storeId;
  const totalBookings = service.length + sales.length;

  return (
    <>
      <PageTop
        title="Esther Bookings"
        subtitle="What Esther booked for you — service &amp; sales · last 14 days"
        right={<><LiveRefresh /><StoreFilter stores={stores} store={storeId ?? "all"} /></>}
      />

      <div className="grid grid-cols-3 gap-3">
        <Tile label="Esther bookings" value={totalBookings} tone="green" />
        <Tile label="Service" value={service.length} tone="blue" />
        <Tile label="Sales" value={sales.length} tone="amber" />
      </div>

      {/* context: Esther's share of everything myKaarma saw this period */}
      <p className="mt-2.5 text-xs text-muted">
        myKaarma this period:{" "}
        <span className="font-semibold text-green">{bySource["ai"] ?? 0} by Esther</span>
        {" · "}{bySource["dms"] ?? 0} DMS{" · "}{bySource["online"] ?? 0} online.{" "}
        Below shows <span className="font-semibold text-ink-soft">only what Esther booked</span>.
      </p>

      {/* ── Service ─────────────────────────────────────────── */}
      <Panel
        title="Service — booked by Esther"
        subtitle="Real myKaarma appointments · newest first"
        icon={<Wrench className="h-4 w-4 text-blue" />}
        headerRight={<CountPill n={service.length} tone="blue" />}
        className="mt-4"
      >
        {service.length === 0 ? (
          <EmptyState label="No service appointments booked by Esther in range" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">When</th>
                  {multiStore && <th className="pb-2 font-semibold">Store</th>}
                  <th className="pb-2 font-semibold">Customer</th>
                  <th className="pb-2 font-semibold">Vehicle</th>
                  <th className="pb-2 font-semibold">Service requested</th>
                </tr>
              </thead>
              <tbody>
                {service.slice(0, 200).map((r) => (
                  <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-muted/5">
                    <td className="whitespace-nowrap py-2.5 text-muted">{fmtDateTime(r.start_time)}</td>
                    {multiStore && <td className="py-2.5 text-ink-soft">{r.store}</td>}
                    <td className="py-2.5 font-medium text-ink">{r.customer_name ?? "—"}</td>
                    <td className="whitespace-nowrap py-2.5 text-ink-soft">{r.vehicle ?? "—"}</td>
                    <td className="max-w-[360px] py-2.5 text-ink-soft" title={r.service ?? ""}>
                      <span className="line-clamp-2">{r.service ?? "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* ── Sales ───────────────────────────────────────────── */}
      <Panel
        title="Sales — booked by Esther"
        subtitle="From sales-department calls (myKaarma has no sales appointments) · newest first"
        icon={<Handshake className="h-4 w-4 text-amber" />}
        headerRight={<CountPill n={sales.length} tone="amber" />}
        className="mt-4"
      >
        {sales.length === 0 ? (
          <EmptyState label="No sales bookings in range" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">When</th>
                  {multiStore && <th className="pb-2 font-semibold">Store</th>}
                  <th className="pb-2 font-semibold">Intent</th>
                  <th className="pb-2 font-semibold">What happened</th>
                  <th className="pb-2 text-right font-semibold">Verify</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 200).map((r) => (
                  <tr key={r.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-muted/5">
                    <td className="whitespace-nowrap py-2.5 text-muted">{fmtDateTime(r.started_at)}</td>
                    {multiStore && <td className="py-2.5 text-ink-soft">{r.store}</td>}
                    <td className="py-2.5">
                      {r.intent ? (
                        <span className="rounded-md bg-amber/15 px-2 py-0.5 text-[11px] font-medium text-amber">
                          {humanizeIntent(r.intent)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="max-w-[420px] py-2.5 text-ink-soft" title={r.summary ?? ""}>
                      <span className="line-clamp-2">{r.summary ?? "—"}</span>
                    </td>
                    <td className="py-2.5 text-right">
                      {r.ghl_url ? (
                        <a
                          href={r.ghl_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand"
                        >
                          Open in GHL <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
