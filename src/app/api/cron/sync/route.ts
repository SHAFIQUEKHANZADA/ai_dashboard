import { NextResponse } from "next/server";

// Vercel Cron hits this every 15 min. It authenticates the caller, then triggers
// the backend ingestion (which pulls GHL + myKaarma into esther_* and rolls up).
// Vercel sends `Authorization: Bearer <CRON_SECRET>`; a manual call may pass
// ?secret=. `days` defaults to 1 (today) — nightly catch-up passes ?days=3.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const provided = auth?.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret") || "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ingestUrl = process.env.ESTHER_INGEST_URL; // full URL to backend /esther/ingest
  if (!ingestUrl) {
    return NextResponse.json({ error: "ESTHER_INGEST_URL not set" }, { status: 500 });
  }
  const days = url.searchParams.get("days") ?? "1";

  const res = await fetch(`${ingestUrl}?days=${days}`, {
    method: "POST",
    headers: { "X-Cron-Secret": secret },
  });
  const body = await res.json().catch(() => ({}));
  return NextResponse.json({ triggered: true, days, backend: res.status, body });
}
