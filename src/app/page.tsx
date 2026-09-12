import { CalendarDays, PieChart, TrendingUp, Target, PhoneMissed, ArrowLeftRight, ArrowRight } from "lucide-react";
import { getStores, getDashboardData } from "@/lib/data";
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
  const stores = await getStores();
  const storeIds = stores.map((s) => s.id);
  const storeNames = new Map(stores.map((s) => [s.id, s.name]));

  const storeId = sp.store && storeIds.includes(sp.store) ? sp.store : null; // null => group
  const date = sp.date || chicagoToday();

  const data = await getDashboardData({ storeId, date, storeIds, storeNames });

  const viewAll = (label: string) => (
    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand">
      {label} <ArrowRight className="h-3.5 w-3.5" />
    </span>
  );

  return (
    <>
      <Header
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
        store={storeId ?? "group"}
        date={date}
        lastUpdated={data.lastUpdated}
        canSeeGroup
        user={{ name: "McGrath Group", role: "Group view" }}
      />

      {/* Row 1 — headline KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {data.headline.map((m) => (
          <KpiCard key={m.key} metric={m} />
        ))}
      </div>

      {/* Row 2 — operational stat cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {data.secondary.map((m) => (
          <StatCard key={m.key} metric={m} />
        ))}
      </div>

      {/* Row 3 — charts */}
      <div className={`mt-4 grid grid-cols-1 gap-4 ${data.showApptsByStore ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {data.showApptsByStore && (
          <Panel title="Appointments by Store" subtitle={`Total booked · ${date}`} icon={<CalendarDays className="h-4 w-4" />}>
            <AppointmentsByStore data={data.apptsByStore} />
          </Panel>
        )}
        <Panel title="Customer Intent" subtitle="Call reason and customer intent" icon={<PieChart className="h-4 w-4" />}>
          <CustomerIntent slices={data.intent} total={data.intentTotal} />
        </Panel>
        <Panel title="Daily Calls & Bookings Trend" subtitle="Last 14 days" icon={<TrendingUp className="h-4 w-4" />}>
          <CallsBookingsTrend data={data.trend} />
        </Panel>
      </div>

      {/* Row 4 — tables + transfers */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Recovered Opportunities"
          subtitle="Customers we re-engaged and converted"
          icon={<Target className="h-4 w-4" />}
          headerRight={
            data.recovered.length ? (
              <span className="rounded-full bg-green/10 px-2.5 py-1 text-[11px] font-semibold text-green">
                {data.recovered.length} recovered
              </span>
            ) : undefined
          }
        >
          <RecoveredTable rows={data.recovered} />
          {data.recovered.length > 0 && viewAll("View All Recovered Opportunities")}
        </Panel>

        <Panel
          title="Missed Calls / Callbacks Needed"
          subtitle="Follow up on these opportunities"
          icon={<PhoneMissed className="h-4 w-4" />}
          headerRight={
            data.callbacks.length ? (
              <span className="rounded-full bg-red/10 px-2.5 py-1 text-[11px] font-semibold text-red">
                {data.callbacks.length} callbacks
              </span>
            ) : undefined
          }
        >
          <CallbacksTable rows={data.callbacks} />
          {data.callbacks.length > 0 && viewAll("View All Missed Calls")}
        </Panel>

        <Panel title="Transfers Breakdown" subtitle="Call transfers to dealership staff" icon={<ArrowLeftRight className="h-4 w-4" />}>
          <TransfersBreakdown successful={data.transfers.successful} failed={data.transfers.failed} total={data.transfers.total} />
        </Panel>
      </div>
    </>
  );
}
