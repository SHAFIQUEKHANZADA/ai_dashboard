import { PageTop, Tile } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { resolveScope } from "@/lib/pages";
import { getOpportunities, type Opportunity } from "@/lib/ghl";

export const dynamic = "force-dynamic";

function fmtMoney(v: number | null) {
  if (v === null) return "—";
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const sp = await searchParams;
  const { stores, storeId } = await resolveScope(sp.store);
  const scope = storeId ? stores.filter((s) => s.id === storeId) : stores;

  const results = await Promise.all(scope.map((s) => getOpportunities(s)));
  const opps: Opportunity[] = results.flatMap((r) => r.opportunities);
  const anyConnected = results.some((r) => r.ok);
  const pipeline = opps.reduce((sum, o) => sum + (o.value ?? 0), 0);

  return (
    <>
      <PageTop
        title="Opportunities"
        subtitle="Open opportunities from GoHighLevel"
        right={<StoreFilter stores={stores} store={storeId ?? "all"} />}
      />

      {!anyConnected ? (
        <Panel title="Opportunities">
          <EmptyState label="No GHL opportunities pipeline connected" />
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Tile label="Open opportunities" value={opps.length} tone="blue" />
            <Tile label="Pipeline value" value={fmtMoney(pipeline)} tone="green" />
            <Tile label="Stores connected" value={results.filter((r) => r.ok).length} />
          </div>
          <Panel title="Open opportunities" className="mt-4">
            {opps.length === 0 ? (
              <EmptyState label="No open opportunities" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                      <th className="pb-2 font-semibold">Opportunity</th>
                      <th className="pb-2 font-semibold">Store</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 text-right font-semibold">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opps.map((o) => (
                      <tr key={o.id} className="border-b border-line/60 last:border-0">
                        <td className="py-2.5 text-ink-soft">{o.name}</td>
                        <td className="py-2.5 text-muted">{o.store}</td>
                        <td className="py-2.5 capitalize text-ink-soft">{o.status ?? "—"}</td>
                        <td className="py-2.5 text-right font-semibold text-ink">{fmtMoney(o.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}
