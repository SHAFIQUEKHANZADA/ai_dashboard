import { BookOpen } from "lucide-react";
import { Panel } from "@/components/panel";
import { METRIC_DEFS, GLOSSARY_ORDER } from "@/lib/metric-defs";

// The "index that spells out what each one is" (Reid). Same definitions the
// hover tooltips use, so the glossary and the cards never drift apart.
export function Glossary() {
  return (
    <Panel
      title="Glossary"
      subtitle="What each metric means and how it's calculated"
      icon={<BookOpen className="h-4 w-4" />}
    >
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {GLOSSARY_ORDER.map((k) => {
          const d = METRIC_DEFS[k];
          if (!d) return null;
          return (
            <div key={k} className="min-w-0">
              <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] font-semibold text-ink">
                {d.label}
                <span className="rounded bg-muted/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted">
                  {d.equation}
                </span>
              </dt>
              <dd className="mt-1 text-[12px] leading-snug text-muted">{d.plain}</dd>
            </div>
          );
        })}
      </dl>
    </Panel>
  );
}
