// Server-only GHL helpers. Reads per-store tokens from env (GHL_TOKEN__<key>).
// Never import into client components.

const BASE = "https://services.leadconnectorhq.com";
// GHL sits behind Cloudflare, which 1010-blocks requests with no/blank UA.
const UA = "Mozilla/5.0 (compatible; EstherDashboard/1.0)";

export function storeToken(storeKey: string): string | undefined {
  return process.env[`GHL_TOKEN__${storeKey}`];
}

type GhlStore = { key: string; name: string; ghl_location_id: string | null };

async function ghlGet(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", Accept: "application/json", "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GHL ${res.status}`);
  return res.json();
}

function contactUrl(loc: string, contactId: string | null | undefined): string | null {
  return contactId ? `https://app.zenvyk.com/v2/location/${loc}/contacts/detail/${contactId}` : null;
}

export interface Opportunity {
  id: string;
  name: string;
  value: number | null;
  status: string | null;
  stage: string | null;
  store: string;
  updatedAt: string | null;
}

export async function getOpportunities(
  store: GhlStore,
): Promise<{ ok: boolean; reason?: string; opportunities: Opportunity[] }> {
  const token = storeToken(store.key);
  if (!token || !store.ghl_location_id) return { ok: false, reason: "no GHL connection", opportunities: [] };
  try {
    const body = await ghlGet(`${BASE}/opportunities/search?location_id=${store.ghl_location_id}&limit=20`, token);
    const list = body.opportunities ?? [];
    return {
      ok: true,
      opportunities: list.map((o: Record<string, unknown>) => ({
        id: String(o.id),
        name: (o.name as string) ?? "Opportunity",
        value: o.monetaryValue != null ? Number(o.monetaryValue) : null,
        status: (o.status as string) ?? null,
        stage: (o.pipelineStageId as string) ?? null,
        store: store.name,
        updatedAt: (o.updatedAt as string) ?? (o.dateAdded as string) ?? null,
      })),
    };
  } catch (e) {
    return { ok: false, reason: String(e), opportunities: [] };
  }
}

// ── Kanban board ────────────────────────────────────────────
// The dealership's live sales funnel, grouped by pipeline stage. Counts come
// from GHL's meta.total (exact, even for thousands of opps); each column also
// carries a handful of the most recent cards as a preview.
export interface OppCard {
  id: string;
  name: string;
  phone: string | null;
  store: string;
  updatedAt: string | null;
  ghlUrl: string | null;
}
export interface BoardStage {
  name: string;
  order: number;
  count: number;
  cards: OppCard[];
}
export interface StoreBoard {
  ok: boolean;
  store: string;
  stages: BoardStage[];
}

// The customer-facing funnel. Internal pipelines (Employee Ideas, RO Audit
// Queue, …) are ignored — this is the one the dealership sells through.
const PRIMARY_PIPELINE = "Customer Acquisition Pipeline";
const CARDS_PER_STAGE = 6;

export async function getOpportunityBoard(store: GhlStore): Promise<StoreBoard> {
  const token = storeToken(store.key);
  const loc = store.ghl_location_id;
  if (!token || !loc) return { ok: false, store: store.name, stages: [] };
  try {
    const pipes = await ghlGet(`${BASE}/opportunities/pipelines?locationId=${loc}`, token);
    const list = pipes.pipelines ?? [];
    const pipe = list.find((p: { name?: string }) => p.name === PRIMARY_PIPELINE) ?? list[0];
    if (!pipe) return { ok: true, store: store.name, stages: [] };

    const stages: BoardStage[] = await Promise.all(
      (pipe.stages ?? []).map(async (s: { id: string; name: string }, i: number) => {
        const b = await ghlGet(
          `${BASE}/opportunities/search?location_id=${loc}&pipeline_id=${pipe.id}&pipeline_stage_id=${s.id}&limit=${CARDS_PER_STAGE}`,
          token,
        );
        const count = b.meta?.total ?? (b.opportunities?.length ?? 0);
        const cards: OppCard[] = (b.opportunities ?? []).map((o: Record<string, unknown>) => {
          const c = (o.contact as Record<string, unknown>) ?? {};
          return {
            id: String(o.id),
            name: (c.name as string) || (o.name as string) || "Unknown contact",
            phone: (c.phone as string) ?? null,
            store: store.name,
            updatedAt: (o.updatedAt as string) ?? (o.dateAdded as string) ?? null,
            ghlUrl: contactUrl(loc, (o.contactId as string) ?? (c.id as string)),
          };
        });
        return { name: s.name, order: i, count, cards };
      }),
    );
    return { ok: true, store: store.name, stages: stages.filter((st) => st.count > 0) };
  } catch {
    return { ok: false, store: store.name, stages: [] };
  }
}

// Merge several stores' boards into one, grouping columns by stage name.
export function mergeBoards(boards: StoreBoard[]): BoardStage[] {
  const byName = new Map<string, BoardStage>();
  for (const b of boards) {
    for (const st of b.stages) {
      const cur = byName.get(st.name);
      if (cur) {
        cur.count += st.count;
        cur.cards.push(...st.cards);
        cur.order = Math.min(cur.order, st.order);
      } else {
        byName.set(st.name, { ...st, cards: [...st.cards] });
      }
    }
  }
  const merged = [...byName.values()];
  for (const st of merged) {
    // keep the newest few cards across stores
    st.cards.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    st.cards = st.cards.slice(0, CARDS_PER_STAGE);
  }
  return merged.sort((a, b) => a.order - b.order);
}
