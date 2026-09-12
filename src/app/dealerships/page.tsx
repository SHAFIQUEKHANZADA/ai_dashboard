import { requireTab } from "@/lib/auth";
import { PageTop } from "@/components/page-top";
import { defaultRange, getStoreSummaries } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function DealershipsPage() {
  await requireTab("/dealerships");
  const { from, to } = defaultRange(14);
  const summaries = await getStoreSummaries(from, to);

  return (
    <>
      <PageTop title="Dealerships" subtitle={`${summaries.length} stores · activity over the last 14 days`} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((s) => (
          <div key={s.store.id} className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-ink">{s.store.name}</h3>
                <p className="text-xs text-muted">{s.store.timezone}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.hasGhl ? "bg-green/10 text-green" : "bg-amber/15 text-amber"}`}>
                {s.hasGhl ? "GHL connected" : "GHL pending"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div><div className="text-xl font-extrabold text-ink">{s.calls}</div><div className="text-[11px] text-muted">Calls</div></div>
              <div><div className="text-xl font-extrabold text-green">{s.booked}</div><div className="text-[11px] text-muted">Booked</div></div>
              <div><div className="text-xl font-extrabold text-ink">{s.transfers}</div><div className="text-[11px] text-muted">Transfers</div></div>
              <div><div className="text-xl font-extrabold text-red">{s.dropped}</div><div className="text-[11px] text-muted">Dropped</div></div>
              <div><div className="text-xl font-extrabold text-amber">{s.callbacks}</div><div className="text-[11px] text-muted">Callbacks</div></div>
              <div><div className="text-xl font-extrabold text-muted">{s.store.mykaarma_dealer_key ? "✓" : "—"}</div><div className="text-[11px] text-muted">myKaarma</div></div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
