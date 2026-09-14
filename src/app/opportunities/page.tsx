import { Phone, ExternalLink } from "lucide-react";
import { requireTab } from "@/lib/auth";
import { PageTop, Tile } from "@/components/page-top";
import { StoreFilter } from "@/components/store-filter";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { resolveScope } from "@/lib/pages";
import { getOpportunityBoard, mergeBoards, type BoardStage, type OppCard } from "@/lib/ghl";
import { STORE_TZ } from "@/lib/format";

export const dynamic = "force-dynamic";

// funnel stage → accent color, mapped onto the theme's tokens
function stageTone(name: string): { bar: string; badge: string } {
  const n = name.toLowerCase();
  if (/sold|won|complete|confirmed|shown/.test(n)) return { bar: "bg-green", badge: "bg-green/10 text-green" };
  if (/lost|no show|dead|abandon/.test(n)) return { bar: "bg-red", badge: "bg-red/10 text-red" };
  if (/booked|test drive/.test(n)) return { bar: "bg-brand", badge: "bg-brand/10 text-brand" };
  if (/reactivation|follow|unsold/.test(n)) return { bar: "bg-amber", badge: "bg-amber/15 text-amber" };
  return { bar: "bg-blue", badge: "bg-blue/10 text-blue" };
}

function relTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: STORE_TZ });
}

function Card({ c, showStore }: { c: OppCard; showStore: boolean }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-ink">{c.name}</span>
        {c.ghlUrl && <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted transition-colors group-hover:text-brand" />}
      </div>
      {c.phone && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted">
          <Phone className="h-3 w-3" /> {c.phone}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        {showStore ? <span className="truncate">{c.store}</span> : <span />}
        <span className="shrink-0">{relTime(c.updatedAt)}</span>
      </div>
    </>
  );
  const cls = "group block rounded-lg border border-line bg-surface p-3 shadow-[var(--shadow)] transition-colors hover:border-brand/40";
  return c.ghlUrl ? (
    <a href={c.ghlUrl} target="_blank" rel="noopener noreferrer" className={cls} title="Open contact in GHL">{inner}</a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function Column({ stage, showStore }: { stage: BoardStage; showStore: boolean }) {
  const tone = stageTone(stage.name);
  const remaining = stage.count - stage.cards.length;
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-line bg-surface-2/40 p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${tone.bar}`} aria-hidden />
        <h3 className="text-[13px] font-bold text-ink">{stage.name}</h3>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${tone.badge}`}>
          {stage.count.toLocaleString()}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {stage.cards.map((c) => (
          <Card key={c.id} c={c} showStore={showStore} />
        ))}
        {remaining > 0 && (
          <p className="pt-1 text-center text-[11px] font-medium text-muted">
            + {remaining.toLocaleString()} more in this stage
          </p>
        )}
      </div>
    </div>
  );
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  await requireTab("/opportunities");
  const sp = await searchParams;
  const { stores, storeId } = await resolveScope(sp.store);
  const scope = storeId ? stores.filter((s) => s.id === storeId) : stores;

  const boards = await Promise.all(scope.map((s) => getOpportunityBoard(s)));
  const connected = boards.filter((b) => b.ok).length;
  const anyConnected = connected > 0;
  const columns = boards.length === 1 ? boards[0].stages : mergeBoards(boards);
  const totalOpen = columns.reduce((n, c) => n + c.count, 0);
  const showStore = scope.length > 1;

  return (
    <>
      <PageTop
        title="Opportunities"
        subtitle="Live sales funnel from GoHighLevel · Customer Acquisition Pipeline"
        right={<StoreFilter stores={stores} store={storeId ?? "all"} />}
      />

      {!anyConnected ? (
        <Panel title="Opportunities">
          <EmptyState label="No GHL opportunities pipeline connected" />
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Tile label="Open opportunities" value={totalOpen.toLocaleString()} tone="blue" />
            <Tile label="Active stages" value={columns.length} />
            <Tile label="Stores connected" value={connected} tone="green" />
          </div>

          {columns.length === 0 ? (
            <Panel title="Pipeline" className="mt-4">
              <EmptyState label="No open opportunities in the pipeline" />
            </Panel>
          ) : (
            <div className="mt-4 flex gap-4 overflow-x-auto pb-3">
              {columns.map((stage) => (
                <Column key={stage.name} stage={stage} showStore={showStore} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
