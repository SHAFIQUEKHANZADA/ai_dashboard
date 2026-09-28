import type { ReactNode } from "react";
import type { CallOutcomes } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

// "Where the N calls went" — the same breakdown that's in the daily report, on the
// dashboard so the two match (Reid). Every call is grouped into HANDLED (a success:
// booked OR a question answered) vs NEEDS FOLLOW-UP; the buckets sum to Total Calls.
// Transfers is shown as an overlay note, not a bucket, so nobody subtracts it.

type Tone = "good" | "warn" | "muted";

function Chip({ n, label, tone }: { n: number; label: string; tone: Tone }) {
  const cls: Record<Tone, string> = {
    good: "bg-green/10 text-green",
    warn: "bg-amber/10 text-amber",
    muted: "bg-muted/10 text-muted",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] ${cls[tone]}`}>
      <b className="font-bold">{n.toLocaleString()}</b>
      <span>{label}</span>
    </span>
  );
}

function Group({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <div>
      <div className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${color}`}>{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function CallOutcomes({ data }: { data: CallOutcomes }) {
  if (!data.total) return <EmptyState />;
  const pct = (n: number) => (data.apptIntent ? Math.round((n / data.apptIntent) * 100) : 0);

  return (
    <div className="space-y-4">
      {/* Appt Intent → Booked headline, so the panel opens with the conversion story. */}
      <p className="text-[13px] text-ink-soft">
        <b className="text-ink">{data.apptIntent.toLocaleString()}</b> callers were trying to book —{" "}
        <b className="text-ink">{data.booked.toLocaleString()}</b> booked
        {data.apptIntent > 0 && <span className="text-muted"> ({pct(data.booked)}%)</span>}.
      </p>

      <Group title="Handled" color="text-green">
        <Chip n={data.booked} label="Booked" tone="good" />
        <Chip n={data.questionsAnswered} label="Questions answered" tone="good" />
      </Group>

      <Group title="Needs follow-up" color="text-amber">
        <Chip n={data.dropped} label="Dropped" tone="warn" />
        <Chip n={data.callbacks} label="Callbacks" tone="warn" />
        {data.noSummary > 0 && <Chip n={data.noSummary} label="No summary" tone="muted" />}
      </Group>

      {data.transfers > 0 && (
        <p className="border-t border-line/60 pt-3 text-[12px] leading-snug text-muted">
          {data.transfers.toLocaleString()} of these {data.total.toLocaleString()} calls were also
          transferred to a person
          {data.transfersVoicemail > 0 && `, ${data.transfersVoicemail.toLocaleString()} of which reached voicemail`}.
          A transfer is a tag on a call, not a separate call — that&apos;s why it overlaps the outcomes
          above instead of adding to them.
        </p>
      )}
    </div>
  );
}
