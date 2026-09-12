import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Panel } from "@/components/panel";
import { EmptyState } from "@/components/empty-state";
import { StoreFilter } from "@/components/store-filter";
import { LiveRefresh } from "@/components/live-refresh";
import { resolveScope, getMetricCalls, isDrillMetric, METRIC_LABEL } from "@/lib/pages";
import { UserMenu } from "@/components/user-menu";
import { fmtDateTime, fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

function chicagoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

const TAG_TONE: Record<string, string> = {
  "service-booked": "bg-green/10 text-green",
  "sales-booked": "bg-green/10 text-green",
  transferred: "bg-blue/10 text-blue",
  dropped: "bg-red/10 text-red",
  "callback-needed": "bg-amber/15 text-amber",
  "needs-attention": "bg-red/10 text-red",
};

export default async function CallsDrillPage({
  searchParams,
}: {
  searchParams: Promise<{ metric?: string; store?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const metric = isDrillMetric(sp.metric) ? sp.metric : "callbacks_needed";
  const date = sp.date || chicagoToday();
  const { stores, storeId, scopeIds, user } = await resolveScope(sp.store);
  const { rows, label } = await getMetricCalls(metric, scopeIds, date);

  // preserve metric + date when switching store via the filter
  const backHref = `/?${new URLSearchParams({ ...(sp.store ? { store: sp.store } : {}), date }).toString()}`;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={backHref} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-brand">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight text-ink">{label}</h1>
          <p className="text-sm text-muted">
            The actual calls behind this number · {fmtDate(date)} · {rows.length} {rows.length === 1 ? "call" : "calls"}
            <span className="ml-1 text-line">·</span> click a call to verify it in GHL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LiveRefresh />
          <StoreFilter stores={stores} store={storeId ?? "all"} />
          {user && <UserMenu user={{ name: user.name, email: user.email, role: user.role }} />}
        </div>
      </div>

      {/* quick switch between the drillable metrics */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(METRIC_LABEL).map(([key, lbl]) => {
          const active = key === metric;
          const href = `/calls?${new URLSearchParams({
            metric: key, ...(sp.store ? { store: sp.store } : {}), date,
          }).toString()}`;
          return (
            <Link
              key={key}
              href={href}
              className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium ${
                active ? "border-brand bg-brand/10 text-brand" : "border-line bg-surface text-ink-soft"
              }`}
            >
              {lbl}
            </Link>
          );
        })}
      </div>

      <Panel title={`${label} — ${fmtDate(date)}`}>
        {rows.length === 0 ? (
          <EmptyState label={`No ${label.toLowerCase()} on this day`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                  <th className="pb-2 font-semibold">Time</th>
                  <th className="pb-2 font-semibold">Store</th>
                  <th className="pb-2 font-semibold">Customer Intent</th>
                  <th className="pb-2 font-semibold">Tags</th>
                  <th className="pb-2 text-right font-semibold">Verify</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 whitespace-nowrap text-muted">{fmtDateTime(r.started_at)}</td>
                    <td className="py-2.5 text-ink-soft">{r.store}</td>
                    <td className="py-2.5 text-ink-soft">{r.intent ?? "—"}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {r.tags.slice(0, 5).map((t) => (
                          <span key={t} className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${TAG_TONE[t] ?? "bg-muted/12 text-muted"}`}>
                            {t}
                          </span>
                        ))}
                      </div>
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
