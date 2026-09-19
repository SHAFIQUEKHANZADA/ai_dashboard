import type { EquityFunnel, EquityRow } from "@/lib/types";

// Reid's accountability report. The question it answers is not "how many
// appraisals" -- that is the card at the top -- but "where did they go".
//
// Every dealership has the same leak: a customer says yes, an alert fires, and
// nobody walks over. Until this existed nobody could prove it either way, so
// the stage that matters most is the drop between Wants options and Claimed.

function pct(n: number, of: number): string {
  if (!of) return "--";
  return `${Math.round((n / of) * 100)}%`;
}

function Stage({
  label, value, of, note,
}: { label: string; value: number; of: number; note?: string }) {
  const width = of ? Math.max(2, Math.round((value / of) * 100)) : 0;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <span className="ml-auto tabular-nums font-semibold">{value}</span>
        <span className="w-12 text-right tabular-nums text-neutral-500">
          {pct(value, of)}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-2 rounded-full bg-blue-500"
          style={{ width: `${width}%` }}
        />
      </div>
      {note ? (
        <p className="mt-1 text-xs text-neutral-500">{note}</p>
      ) : null}
    </div>
  );
}

export function EquityFunnelPanel({
  funnel, rows,
}: { funnel: EquityFunnel; rows: EquityRow[] }) {
  const top = funnel.scheduled;

  // The one number worth putting in words. A customer who agreed to be
  // approached and was never approached is the most expensive thing on this
  // page -- they asked, in the building, and nobody came.
  const missed = Math.max(0, funnel.wantsOptions - funnel.claimed);

  if (!top) {
    return (
      <p className="py-8 text-center text-sm text-neutral-500">
        No appraisals yet today. Customers who say yes to a trade value while
        they&rsquo;re in for service show up here.
      </p>
    );
  }

  return (
    <div>
      <Stage label="Said yes to a value" value={funnel.scheduled} of={top} />
      <Stage label="Wanted to see options" value={funnel.wantsOptions} of={top} />
      <Stage
        label="Claimed by a salesperson"
        value={funnel.claimed}
        of={top}
        note={missed > 0
          ? `${missed} ${missed === 1 ? "customer" : "customers"} asked and nobody went over`
          : undefined}
      />
      <Stage label="Options presented" value={funnel.presented} of={top} />
      <Stage label="Sold" value={funnel.sold} of={top} />

      {rows.length > 0 && (
        <table className="mt-5 w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800">
              <th className="py-2 font-medium">Customer</th>
              <th className="py-2 font-medium">Vehicle</th>
              <th className="py-2 font-medium">Priority</th>
              <th className="py-2 font-medium">Salesperson</th>
              <th className="py-2 font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-neutral-100 last:border-0 dark:border-neutral-900"
              >
                <td className="py-2">{r.customer_name ?? "--"}</td>
                <td className="py-2 text-neutral-500">{r.vehicle ?? "--"}</td>
                <td className="py-2 tabular-nums">
                  {r.priority_score ?? "--"}
                  {r.priority_band ? (
                    <span className="ml-1 text-xs uppercase text-neutral-500">
                      {r.priority_band}
                    </span>
                  ) : null}
                </td>
                {/* An unclaimed row is the finding, not a gap in the data --
                    say so rather than leaving a dash to be read as missing. */}
                <td className="py-2">
                  {r.claimed_by ?? (
                    <span className="text-amber-600 dark:text-amber-500">
                      nobody went
                    </span>
                  )}
                </td>
                <td className="py-2 text-neutral-500">{r.outcome ?? "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
