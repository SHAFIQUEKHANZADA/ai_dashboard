import Link from "next/link";
import { CalendarDays, PieChart, TrendingUp, Target, PhoneMissed, ArrowLeftRight, ArrowRight } from "lucide-react";
import { getDashboardData } from "@/lib/data";
import { isDrillMetric } from "@/lib/pages";
import { requireUser, getAccessibleStores } from "@/lib/auth";
import { Header } from "@/components/header";
import { KpiCard } from "@/components/kpi-card";
import { StatCard } from "@/components/stat-card";
import { Panel } from "@/components/panel";
import { AppointmentsByStore } from "@/components/charts/appointments-by-store";
import { CustomerIntent } from "@/components/charts/customer-intent";
import { CallsBookingsTrend } from "@/components/charts/calls-bookings-trend";
import { TransfersBreakdown } from "@/components/charts/transfers-breakdown";
import { RecoveredTable } from "@/components/tables/recovered-table";
import { CallbacksTable } from "@/components/tables/callbacks-table";

export const dynamic = "force-dynamic";

function chicagoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const stores = await getAccessibleStores(user);
  const storeIds = stores.map((s) => s.id);
  const storeNames = new Map(stores.map((s) => [s.id, s.name]));

  // group total only for admin/group; store users default to their first store
  const storeId = sp.store && storeIds.includes(sp.store)
    ? sp.store
    : user.canSeeGroup ? null : (storeIds[0] ?? null);
  const date = sp.date || chicagoToday();

  const data = await getDashboardData({ storeId, date, storeIds, storeNames });

  // build a drill-down link that keeps the current store + date
  const drillHref = (metric: string) =>
    `/calls?${new URLSearchParams({ metric, ...(storeId ? { store: storeId } : {}), date }).toString()}`;

  const viewAll = (label: string, metric: string) => (
    <Link href={drillHref(metric)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );

  return (
    <>
      <Header
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
        store={storeId ?? "group"}
        date={date}
        lastUpdated={data.lastUpdated}
        canSeeGroup={user.canSeeGroup}
        user={{ name: user.name, email: user.email, role: user.role }}
      />

      {/* Row 1 — headline KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {data.headline.map((m) => (
          <KpiCard key={m.key} metric={m} />
        ))}
      </div>

      {/* Row 2 — operational stat cards (drillable ones link to the actual calls) */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {data.secondary.map((m) =>
          isDrillMetric(m.key) && !m.awaiting ? (
            <Link
              key={m.key}
              href={drillHref(m.key)}
              className="block rounded-xl transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
            >
              <StatCard metric={m} />
            </Link>
          ) : (
            <StatCard key={m.key} metric={m} />
          )
        )}
      </div>

      {/* Row 3 — charts */}
      <div className={`mt-4 grid grid-cols-1 gap-4 ${data.showApptsByStore ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {data.showApptsByStore && (
          <Panel title="Appointments by Store" subtitle={`Total booked · ${date}`} icon={<CalendarDays className="h-4 w-4" />}>
            <AppointmentsByStore data={data.apptsByStore} />
          </Panel>
        )}
        <Panel title="Customer Intent" subtitle="Call reason — AI-classified from each call" icon={<PieChart className="h-4 w-4" />}>
          <CustomerIntent slices={data.insights.intentDetail} total={data.insights.callsConsidered || data.intentTotal} />
        </Panel>
        <Panel title="Daily Calls & Bookings Trend" subtitle="Last 14 days" icon={<TrendingUp className="h-4 w-4" />}>
          <CallsBookingsTrend data={data.trend} />
        </Panel>
      </div>

      {/* Row 4 — tables + transfers */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Recovered Opportunities"
          subtitle={`Customers we re-engaged and converted${data.recoveredValueEst ? ` · ~$${data.recoveredValueEst.toLocaleString()} est. value` : ""}`}
          icon={<Target className="h-4 w-4" />}
          headerRight={
            data.recoveredTotal ? (
              <span className="whitespace-nowrap rounded-full bg-green/10 px-2.5 py-1 text-[11px] font-semibold text-green">
                {data.recoveredTotal} recovered
              </span>
            ) : undefined
          }
        >
          <RecoveredTable rows={data.recovered} />
          {data.recoveredTotal > 0 && viewAll("View All Recovered Opportunities", "recovered_count")}
        </Panel>

        <Panel
          title="Missed Calls / Callbacks Needed"
          subtitle="Follow up on these opportunities"
          icon={<PhoneMissed className="h-4 w-4" />}
          headerRight={
            data.callbacksTotal ? (
              <span className="whitespace-nowrap rounded-full bg-red/10 px-2.5 py-1 text-[11px] font-semibold text-red">
                {data.callbacksTotal} callbacks
              </span>
            ) : undefined
          }
        >
          <CallbacksTable rows={data.callbacks} />
          {data.callbacksTotal > 0 && viewAll("View All Missed Calls", "callbacks_needed")}
        </Panel>

        <Panel title="Transfers Breakdown" subtitle="Call transfers to dealership staff" icon={<ArrowLeftRight className="h-4 w-4" />}>
          <TransfersBreakdown successful={data.transfers.successful} failed={data.transfers.failed} total={data.transfers.total} reasons={data.insights.transferReasons} />
          {data.transfers.total > 0 && viewAll("View All Transfers", "transfers")}
        </Panel>
      </div>

      {/* Row 5 — sentiment & human preference (AI-classified) */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Customer Sentiment"
          subtitle={`AI-scored · ${data.insights.sentimentSampled} calls analyzed`}
          icon={<TrendingUp className="h-4 w-4" />}
        >
          {data.insights.sentimentAvg === null ? (
            <p className="text-sm text-muted">Awaiting AI analysis</p>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold ${data.insights.sentimentAvg > 20 ? "text-green" : data.insights.sentimentAvg < -20 ? "text-red" : "text-amber"}`}>
                {data.insights.sentimentAvg > 0 ? "+" : ""}{data.insights.sentimentAvg}
              </span>
              <span className="text-xs text-muted">avg closing<br />(−100 to +100)</span>
            </div>
          )}
        </Panel>

        <Panel
          title="Sentiment Deteriorated"
          subtitle="Calls that ended worse than they started"
          icon={<PhoneMissed className="h-4 w-4" />}
        >
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-extrabold ${data.insights.sentimentDeteriorated ? "text-red" : "text-ink"}`}>
              {data.insights.sentimentDeteriorated}
            </span>
            <span className="text-xs text-muted">of {data.insights.sentimentSampled} analyzed</span>
          </div>
        </Panel>

        <Panel
          title="Human Preference Rate"
          subtitle="Customers who explicitly asked for a person"
          icon={<Target className="h-4 w-4" />}
        >
          {data.insights.callsConsidered === 0 ? (
            <p className="text-sm text-muted">No calls</p>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-ink">
                {Math.round((100 * data.insights.humanRequested) / data.insights.callsConsidered)}%
              </span>
              <span className="text-xs text-muted">{data.insights.humanRequested} of {data.insights.callsConsidered} calls</span>
            </div>
          )}
        </Panel>
        
      </div>
    </>
  );
}
