import { ArrowUp, ArrowDown } from "lucide-react";
import { computeDelta } from "@/lib/format";
import type { GoodDirection } from "@/lib/types";

export function DeltaBadge({
  current,
  previous,
  goodDirection,
  suffix = "vs. previous day",
}: {
  current: number | null;
  previous: number | null;
  goodDirection: GoodDirection;
  suffix?: string;
}) {
  const d = computeDelta(current, previous, goodDirection);
  if (d.pct === null) {
    return <span className="text-xs text-muted">No prior day</span>;
  }
  const color = d.good === null ? "text-muted" : d.good ? "text-good" : "text-bad";
  const Arrow = d.arrow === "down" ? ArrowDown : ArrowUp;
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-semibold ${color}`}>
        {d.arrow !== "flat" && <Arrow className="h-3.5 w-3.5" strokeWidth={2.5} />}
        {d.label}
      </span>
      <span className="text-muted">{suffix}</span>
    </div>
  );
}
