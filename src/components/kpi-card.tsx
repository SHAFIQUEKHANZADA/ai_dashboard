import { Phone, CalendarCheck, Percent, DollarSign, BarChart3, Gauge, TrendingUp, type LucideIcon } from "lucide-react";
import { formatMetric } from "@/lib/format";
import { DeltaBadge } from "@/components/delta-badge";
import type { MetricValue } from "@/lib/types";

// One-line definitions under a KPI so the denominator is never in question
// (Reid: "add a small definition so nobody questions the number").
const DEFINITION: Record<string, string> = {
  conversion_overall: "Booked ÷ all calls",
  conversion_appointment: "Booked ÷ calls that tried to book",
  containment_rate: "Handled by Esther — booked, info, or correctly transferred ÷ eligible calls",
  cost_per_booking: "AI spend ÷ appointments booked",
  appointments_booked: "Distinct calls that booked",
  booking_pct: "Booked ÷ eligible calls",
};

const VISUAL: Record<string, { icon: LucideIcon; tile: string }> = {
  total_calls: { icon: Phone, tile: "bg-blue" },
  appointments_booked: { icon: CalendarCheck, tile: "bg-green" },
  booking_pct: { icon: Percent, tile: "bg-purple" },
  conversion_overall: { icon: Percent, tile: "bg-purple" },
  conversion_appointment: { icon: TrendingUp, tile: "bg-purple" },
  containment_rate: { icon: Gauge, tile: "bg-blue" },
  cost_per_booking: { icon: DollarSign, tile: "bg-orange" },
  ai_spend: { icon: BarChart3, tile: "bg-teal" },
};

export function KpiCard({ metric }: { metric: MetricValue }) {
  const v = VISUAL[metric.key] ?? { icon: BarChart3, tile: "bg-brand" };
  const Icon = v.icon;
  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between">
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${v.tile}`}>
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </span>
      </div>
      {/* Reserve two lines so a label that wraps (e.g. "Appointment Conversion")
          keeps its value on the same baseline as the one-line cards beside it. */}
      <div className="mt-4 flex min-h-[2.5em] items-start text-[13px] font-medium leading-tight text-muted">{metric.label}</div>
      <div className="mt-1 truncate text-[30px] font-extrabold leading-none tracking-tight text-ink">
        {metric.awaiting ? (
          <span className="text-[20px] text-muted">Awaiting data</span>
        ) : (
          <>
            {metric.estimated && <span className="text-muted">~</span>}
            {formatMetric(metric.value, metric.unit)}
          </>
        )}
      </div>
      {DEFINITION[metric.key] && (
        <div className="mt-1.5 text-[10px] leading-tight text-muted/80">{DEFINITION[metric.key]}</div>
      )}
      <div className="mt-auto pt-3">
        {metric.awaiting ? (
          <span className="text-xs text-muted">Source coming soon</span>
        ) : metric.estimated ? (
          <span
            title="Estimated — trues up with billing"
            className="inline-block rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-semibold leading-tight text-amber"
          >
            Estimated · trues up
          </span>
        ) : (
          <DeltaBadge current={metric.value} previous={metric.previous} goodDirection={metric.good_direction} />
        )}
      </div>
    </div>
  );
}
