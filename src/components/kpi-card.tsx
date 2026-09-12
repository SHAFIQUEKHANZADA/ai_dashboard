import { Phone, CalendarCheck, Percent, DollarSign, BarChart3, type LucideIcon } from "lucide-react";
import { formatMetric } from "@/lib/format";
import { DeltaBadge } from "@/components/delta-badge";
import type { MetricValue } from "@/lib/types";

const VISUAL: Record<string, { icon: LucideIcon; tile: string }> = {
  total_calls: { icon: Phone, tile: "bg-blue" },
  appointments_booked: { icon: CalendarCheck, tile: "bg-green" },
  booking_pct: { icon: Percent, tile: "bg-purple" },
  cost_per_booking: { icon: DollarSign, tile: "bg-orange" },
  ai_spend: { icon: BarChart3, tile: "bg-teal" },
};

export function KpiCard({ metric }: { metric: MetricValue }) {
  const v = VISUAL[metric.key] ?? { icon: BarChart3, tile: "bg-brand" };
  const Icon = v.icon;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between">
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${v.tile}`}>
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </span>
      </div>
      <div className="mt-4 text-[13px] font-medium text-muted">{metric.label}</div>
      <div className="mt-1 text-[34px] font-extrabold leading-none tracking-tight text-ink">
        {metric.awaiting ? <span className="text-[20px] text-muted">Awaiting data</span> : formatMetric(metric.value, metric.unit)}
      </div>
      <div className="mt-3">
        {metric.awaiting ? (
          <span className="text-xs text-muted">Source coming soon</span>
        ) : (
          <DeltaBadge current={metric.value} previous={metric.previous} goodDirection={metric.good_direction} />
        )}
      </div>
    </div>
  );
}
