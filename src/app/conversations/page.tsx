import { ExternalLink, AlertTriangle } from "lucide-react";
import { requireTab } from "@/lib/auth";
import { PageTop, Tile } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { LiveRefresh } from "@/components/live-refresh";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { resolveScope, defaultRange, getCalls, type CallRow } from "@/lib/pages";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// The single headline status for a conversation, from its call outcome.
const OUTCOME: Record<string, { label: string; dot: string; badge: string }> = {
  booked: { label: "Booked", dot: "bg-green", badge: "bg-green/10 text-green" },
  callback_needed: { label: "Callback", dot: "bg-amber", badge: "bg-amber/15 text-amber" },
  dropped: { label: "Dropped", dot: "bg-red", badge: "bg-red/10 text-red" },
  info_only: { label: "Info only", dot: "bg-muted", badge: "bg-muted/15 text-muted" },
};
const ENGAGED = { label: "Engaged", dot: "bg-blue", badge: "bg-blue/10 text-blue" };

function outcomeOf(r: CallRow) {
  return (r.outcome && OUTCOME[r.outcome]) || ENGAGED;
}

function ConversationRow({ r }: { r: CallRow }) {
  const o = outcomeOf(r);
  const dept = r.department === "service" ? "Service" : r.department === "sales" ? "Sales" : null;
  const meta = [r.intent, dept].filter(Boolean).join(" · ");
  const needsAttention = r.tags.includes("needs-attention");

  const inner = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${o.dot}`} aria-hidden />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-semibold text-ink">{r.store}</span>
            <span className="whitespace-nowrap text-xs text-muted">{fmtDateTime(r.started_at)}</span>
          </div>
          <div className="truncate text-xs text-muted">{meta || "—"}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {needsAttention && (
          <span className="inline-flex items-center gap-1 rounded-md bg-red/10 px-2 py-0.5 text-[11px] font-medium text-red">
            <AlertTriangle className="h-3 w-3" /> Needs attention
          </span>
        )}
        {r.transferred && (
          <span className="hidden rounded-md bg-blue/10 px-2 py-0.5 text-[11px] font-medium text-blue sm:inline">
            Transferred
          </span>
        )}
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${o.badge}`}>{o.label}</span>
        {r.ghl_url && <ExternalLink className="h-3.5 w-3.5 text-muted transition-colors group-hover:text-brand" />}
      </div>
    </>
  );

  const cls =
    "group flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 -mx-2 transition-colors hover:bg-muted/5";
  return r.ghl_url ? (
    <a href={r.ghl_url} target="_blank" rel="noopener noreferrer" className={cls} title="Open contact in GHL">
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  await requireTab("/conversations");
  const sp = await searchParams;
  const { stores, storeId, scopeIds, names } = await resolveScope(sp.store);
  const { from, to } = defaultRange(14);
  const data = await getCalls(scopeIds, names, from, to);
  const needAttention = data.rows.filter((r) => r.tags.includes("needs-attention")).length;

  return (
    <>
      <PageTop
        title="Conversations"
        subtitle="Every contact Esther engaged, by outcome · last 14 days"
        right={<><LiveRefresh /><StoreFilter stores={stores} store={storeId ?? "all"} /></>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Conversations" value={data.total} tone="blue" />
        <Tile label="Service dept" value={data.byDept["service"] ?? 0} />
        <Tile label="Sales dept" value={data.byDept["sales"] ?? 0} tone="amber" />
        <Tile label="Need attention" value={needAttention} tone="red" />
      </div>

      <Panel
        title="Recent conversations"
        subtitle="Newest first · click a row to open the contact in GHL"
        className="mt-4"
      >
        {data.rows.length === 0 ? (
          <EmptyState label="No conversations in range" />
        ) : (
          <ul className="divide-y divide-line/50">
            {data.rows.slice(0, 100).map((r) => (
              <li key={r.id}>
                <ConversationRow r={r} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
