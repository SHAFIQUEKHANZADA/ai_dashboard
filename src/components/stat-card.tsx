import {
  ArrowLeftRight, AlertTriangle, PhoneOff, Clock, Target, Star, type LucideIcon,
} from "lucide-react";
import { formatMetric } from "@/lib/format";
import { DeltaBadge } from "@/components/delta-badge";
import type { MetricValue } from "@/lib/types";

const VISUAL: Record<string, { icon: LucideIcon; tint: string; fg: string }> = {
  transfers:            { icon: ArrowLeftRight, tint: "bg-blue/10",   fg: "text-blue" },
  failed_transfers:     { icon: AlertTriangle,  tint: "bg-red/10",    fg: "text-red" },
  dropped_calls:        { icon: PhoneOff,       tint: "bg-slate-400/15", fg: "text-slate-500" },
  callbacks_needed:     { icon: Clock,          tint: "bg-purple/10", fg: "text-purple" },
  recovered_count:      { icon: Target,         tint: "bg-green/10",  fg: "text-green" },
  secret_shopper_score: { icon: Star,           tint: "bg-amber/15",  fg: "text-amber" },
};

export function StatCard({ metric }: { metric: MetricValue }) {
  const v = VISUAL[metric.key] ?? { icon: Target, tint: "bg-brand/10", fg: "text-brand" };
  const Icon = v.icon;
  return (
    <div className="flex h-full min-w-0 flex-col rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${v.tint} ${v.fg}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 text-[12.5px] font-medium leading-tight text-muted">{metric.label}</span>
      </div>
      <div className="mt-3 truncate text-[26px] font-extrabold leading-none tracking-tight text-ink">
        {metric.awaiting ? <span className="text-[15px] text-muted">Awaiting data</span> : formatMetric(metric.value, metric.unit)}
      </div>
      <div className="mt-auto pt-2">
        {metric.awaiting ? (
          <span className="text-[11px] text-muted">Source coming soon</span>
        ) : (
          <DeltaBadge current={metric.value} previous={metric.previous} goodDirection={metric.good_direction} suffix="" />
        )}
      </div>
    </div>
  );
}
