import { requireTab } from "@/lib/auth";
import { PageTop, Tile } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { LiveRefresh } from "@/components/live-refresh";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { resolveScope, defaultRange, getCalls } from "@/lib/pages";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// tags the operator cares about get color; the rest are neutral chips
const TAG_TONE: Record<string, string> = {
  "service-booked": "bg-green/10 text-green",
  "sales-booked": "bg-green/10 text-green",
  "transferred": "bg-blue/10 text-blue",
  "dropped": "bg-red/10 text-red",
  "callback-needed": "bg-amber/15 text-amber",
  "needs-attention": "bg-red/10 text-red",
};

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  await requireTab("/conversations");
  const sp = await searchParams;
  const { stores, storeId, scopeIds, names } = await resolveScope(sp.store);
  const { from, to } = defaultRange(14);
  const data = await getCalls(scopeIds, names, from, to);

  return (
    <>
      <PageTop
        title="Conversations"
        subtitle="Every contact Esther engaged, with the AI's post-call tags · last 14 days"
        right={<><LiveRefresh /><StoreFilter stores={stores} store={storeId ?? "all"} /></>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Conversations" value={data.total} tone="blue" />
        <Tile label="Service dept" value={data.byDept["service"] ?? 0} />
        <Tile label="Sales dept" value={data.byDept["sales"] ?? 0} />
        <Tile label="Need attention" value={data.rows.filter((r) => r.tags.includes("needs-attention")).length} tone="red" />
      </div>

      <Panel title="Recent conversations" className="mt-4">
        {data.rows.length === 0 ? (
          <EmptyState label="No conversations in range" />
        ) : (
          <ul className="divide-y divide-line/60">
            {data.rows.slice(0, 80).map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted whitespace-nowrap">{fmtDateTime(r.started_at)}</span>
                  <span className="text-[13px] font-medium text-ink-soft">{r.store}</span>
                  {r.intent && <span className="text-[13px] text-muted">· {r.intent}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.tags.slice(0, 6).map((t) => (
                    <span key={t} className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${TAG_TONE[t] ?? "bg-muted/12 text-muted"}`}>{t}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
