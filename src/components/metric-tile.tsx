import type { LucideIcon } from "lucide-react";

type Tone = "ink" | "green" | "red" | "amber" | "blue" | "purple" | "teal";

const TILE: Record<Tone, string> = {
  ink: "bg-navy-2",
  green: "bg-green",
  red: "bg-red",
  amber: "bg-amber",
  blue: "bg-blue",
  purple: "bg-purple",
  teal: "bg-teal",
};

/**
 * The headline number on a secondary page. Same visual language as the main
 * dashboard's KpiCard (icon tile, big figure, caption) so moving between pages
 * doesn't feel like moving between two different products — just smaller,
 * because these pages show five of them rather than five across a hero row.
 */
export function MetricTile({
  label,
  value,
  caption,
  icon: Icon,
  tone = "ink",
}: {
  label: string;
  value: string | number;
  caption?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-white ${TILE[tone]}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <span className="text-[12px] font-medium text-muted">{label}</span>
      </div>
      <div className="mt-2.5 text-[28px] font-extrabold leading-none tracking-tight text-ink">
        {value}
      </div>
      {caption && <div className="mt-1.5 text-[11px] text-muted">{caption}</div>}
    </div>
  );
}

/**
 * A three-stage funnel rendered as proportional bars. Reid's question is
 * "of everyone we texted, how many came back" — a ratio reads faster as
 * relative width than as three numbers he has to divide in his head.
 */
export function Funnel({
  stages,
}: {
  stages: { label: string; value: number; tone: "blue" | "amber" | "green" }[];
}) {
  const top = Math.max(...stages.map((s) => s.value), 1);
  const bar: Record<string, string> = {
    blue: "bg-blue",
    amber: "bg-amber",
    green: "bg-green",
  };
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const pctOfTop = Math.round((s.value / top) * 100);
        const prev = i === 0 ? null : stages[i - 1].value;
        const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium text-ink-soft">{s.label}</span>
              <span className="text-[13px] font-bold text-ink">
                {s.value}
                {conv != null && <span className="ml-1.5 text-[11px] font-semibold text-muted">{conv}%</span>}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full ${bar[s.tone]}`}
                style={{ width: `${Math.max(pctOfTop, s.value > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
