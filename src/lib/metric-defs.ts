// Single source of truth for what every dashboard metric means and its equation.
// Used by the KPI/stat cards (hover tooltip) AND the Glossary panel, so the
// definition a user hovers matches the index exactly (Reid: "a glossary/index
// that spells out what each one is, or a hover-over that shows the equation").

export interface MetricDef {
  label: string;      // display name
  equation: string;   // the formula, in plain math
  plain: string;      // one sentence in plain English
}

export const METRIC_DEFS: Record<string, MetricDef> = {
  total_calls: {
    label: "Total Calls",
    equation: "count of all calls Esther handled",
    plain: "Every inbound call Esther took in the period.",
  },
  appointments_booked: {
    label: "Appointments Booked",
    equation: "count of calls that booked an appointment",
    plain: "Each appointment booked counts once — a customer who books twice is two appointments.",
  },
  conversion_overall: {
    label: "Conversion — Overall",
    equation: "appointments booked ÷ all calls",
    plain: "Of every call that came in, the share that ended in a booking.",
  },
  conversion_appointment: {
    label: "Conversion — Appointment",
    equation: "appointments booked ÷ booking attempts",
    plain: "Of the callers who were actually trying to book (excludes pure info calls), the share that booked.",
  },
  containment_rate: {
    label: "AI Resolution Rate",
    equation: "(booked + info-only + correct transfers) ÷ eligible calls",
    plain: "Share of eligible calls Esther handled without a person stepping in — booked, answered an info question, or correctly transferred. Eligible = service/sales calls with a transcript.",
  },
  cost_per_booking: {
    label: "AI Cost per Booking",
    equation: "AI spend ÷ appointments booked",
    plain: "What Esther cost per appointment booked.",
  },
  ai_spend: {
    label: "AI Spend",
    equation: "sum of AI cost for the day (voice + workflow + reviews + content)",
    plain: "Total cost of running Esther for the period. Estimated until billing trues up.",
  },
  booking_pct: {
    label: "Booking %",
    equation: "appointments booked ÷ eligible calls",
    plain: "Bookings as a share of eligible service/sales calls.",
  },
  transfers: {
    label: "Service Transfers",
    equation: "count of calls transferred to a person (service)",
    plain: "Calls Esther routed to a person. Not all are scheduling — includes asking for a specific advisor, repair status, warranty/parts/billing questions.",
  },
  transfer_pct: {
    label: "Transfer %",
    equation: "service transfers ÷ all calls",
    plain: "Share of calls that needed a person. Not a missed-booking rate — much of it is Esther correctly routing non-scheduling calls.",
  },
  failed_transfers: {
    label: "Failed Transfers",
    equation: "transfers that did not connect to a person",
    plain: "Transfers where the call didn't reach a live person before ending.",
  },
  dropped_calls: {
    label: "Dropped Calls",
    equation: "count of calls that ended without resolution",
    plain: "Calls that hit voicemail, hung up, or ended unresolved.",
  },
  callbacks_needed: {
    label: "Callbacks Needed",
    equation: "count of calls where a follow-up is owed",
    plain: "Callers the team still owes a call back.",
  },
  recovered_count: {
    label: "Recovered Opportunities",
    equation: "at-risk callers (dropped / callback / needs-attention) who later booked",
    plain: "Customers who might have been lost but ended up booking because of follow-up.",
  },
  secret_shopper_score: {
    label: "Secret Shopper Score",
    equation: "QA score of sampled calls",
    plain: "Quality score from graded calls (source coming soon).",
  },
};

// The order metrics appear in the Glossary index.
export const GLOSSARY_ORDER: string[] = [
  "total_calls",
  "appointments_booked",
  "conversion_overall",
  "conversion_appointment",
  "containment_rate",
  "cost_per_booking",
  "ai_spend",
  "transfers",
  "transfer_pct",
  "failed_transfers",
  "dropped_calls",
  "callbacks_needed",
  "recovered_count",
  "secret_shopper_score",
];

export function metricTip(key: string): string | undefined {
  const d = METRIC_DEFS[key];
  return d ? `${d.label} = ${d.equation}. ${d.plain}` : undefined;
}
