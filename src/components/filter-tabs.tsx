import Link from "next/link";

export interface FilterTab {
  key: string;
  label: string;
  count?: number;
  tone?: "ink" | "red" | "amber" | "green" | "blue";
}

/**
 * Segmented control for filtering a list in place.
 *
 * State lives in the URL rather than in component state, so a filtered view is
 * linkable and survives the page refresh the dashboard does on a timer — a
 * client-side toggle would silently reset itself every time data reloaded.
 */
export function FilterTabs({
  tabs,
  active,
  param = "view",
  base,
  keep = {},
}: {
  tabs: FilterTab[];
  active: string;
  param?: string;
  base: string;
  keep?: Record<string, string | undefined>;
}) {
  const href = (key: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(keep)) if (v) q.set(k, v);
    if (key !== tabs[0].key) q.set(param, key);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  const toneFor = (t: FilterTab, on: boolean) => {
    if (!on) return "text-muted hover:text-ink-soft";
    switch (t.tone) {
      case "red": return "bg-red/10 text-red";
      case "amber": return "bg-amber/15 text-amber";
      case "green": return "bg-green/10 text-green";
      case "blue": return "bg-blue/10 text-blue";
      default: return "bg-surface text-ink shadow-[var(--shadow)]";
    }
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={href(t.key)}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${toneFor(t, on)}`}
          >
            {t.label}
            {t.count != null && (
              <span
                className={`rounded-full px-1.5 py-px text-[11px] font-bold ${
                  on ? "bg-surface-2 text-ink" : "bg-line/70 text-muted"
                }`}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
