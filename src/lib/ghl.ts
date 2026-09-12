// Server-only GHL helpers. Reads per-store tokens from env (GHL_TOKEN__<key>).
// Never import into client components.

const BASE = "https://services.leadconnectorhq.com";

export function storeToken(storeKey: string): string | undefined {
  return process.env[`GHL_TOKEN__${storeKey}`];
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
  store: { key: string; name: string; ghl_location_id: string | null },
): Promise<{ ok: boolean; reason?: string; opportunities: Opportunity[] }> {
  const token = storeToken(store.key);
  if (!token || !store.ghl_location_id) return { ok: false, reason: "no GHL connection", opportunities: [] };
  try {
    const url = `${BASE}/opportunities/search?location_id=${store.ghl_location_id}&limit=20`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28", Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, reason: `GHL ${res.status}`, opportunities: [] };
    const body = await res.json();
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
