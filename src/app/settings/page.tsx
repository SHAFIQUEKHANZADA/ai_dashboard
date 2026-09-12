import { PageTop } from "@/components/page-top";
import { Panel } from "@/components/panel";
import { createServiceClient } from "@/lib/supabase/server";
import type { MetricDefinition, Store } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const sb = createServiceClient();
  const [{ data: stores }, { data: defs }] = await Promise.all([
    sb.from("esther_stores").select("*").order("sort_order"),
    sb.from("esther_metric_definitions").select("*").order("sort_order"),
  ]);

  return (
    <>
      <PageTop title="Settings" subtitle="Stores and metric configuration (read-only in Phase 1)" />

      <Panel title="Stores" subtitle="Adding a store here + its token makes it appear everywhere — no code change">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-semibold">Store</th>
                <th className="pb-2 font-semibold">Key</th>
                <th className="pb-2 font-semibold">GHL location</th>
                <th className="pb-2 font-semibold">myKaarma</th>
                <th className="pb-2 font-semibold">Timezone</th>
              </tr>
            </thead>
            <tbody>
              {((stores ?? []) as Store[]).map((s) => (
                <tr key={s.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 font-medium text-ink">{s.name}</td>
                  <td className="py-2.5 text-muted">{s.key}</td>
                  <td className="py-2.5">
                    {s.ghl_location_id
                      ? <span className="rounded-md bg-green/10 px-2 py-0.5 text-[11px] font-semibold text-green">connected</span>
                      : <span className="rounded-md bg-amber/15 px-2 py-0.5 text-[11px] font-semibold text-amber">pending</span>}
                  </td>
                  <td className="py-2.5 text-ink-soft">{s.mykaarma_dealer_key ? "✓" : "—"}</td>
                  <td className="py-2.5 text-muted">{s.timezone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Metrics" subtitle="Direction is stored, never inferred — configurable without a code change" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                <th className="pb-2 font-semibold">Metric</th>
                <th className="pb-2 font-semibold">Unit</th>
                <th className="pb-2 font-semibold">Good direction</th>
                <th className="pb-2 font-semibold">Group</th>
              </tr>
            </thead>
            <tbody>
              {((defs ?? []) as MetricDefinition[]).map((d) => (
                <tr key={d.key} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 font-medium text-ink">{d.label}</td>
                  <td className="py-2.5 text-muted">{d.unit ?? "—"}</td>
                  <td className="py-2.5">
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${d.good_direction === "up" ? "bg-green/10 text-green" : "bg-blue/10 text-blue"}`}>
                      {d.good_direction === "up" ? "↑ higher is better" : "↓ lower is better"}
                    </span>
                  </td>
                  <td className="py-2.5 capitalize text-ink-soft">{d.display_group}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
