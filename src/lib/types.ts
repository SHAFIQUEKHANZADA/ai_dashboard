// Domain types for the Esther AI Performance Dashboard.

export type UserRole = "admin" | "group" | "store";

export interface Store {
  id: string;
  key: string;
  name: string;
  ghl_location_id: string | null;
  mykaarma_dealer_key: string | null;
  timezone: string;
  active: boolean;
  sort_order: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
}

export type MetricGroup = "headline" | "secondary";
export type MetricUnit = "count" | "currency" | "percent" | "score";
export type GoodDirection = "up" | "down";

export interface MetricDefinition {
  key: string;
  label: string;
  unit: MetricUnit | null;
  good_direction: GoodDirection;
  display_group: MetricGroup;
  sort_order: number;
  formula: string | null;
  enabled: boolean;
}

// One store-day rollup row (what the dashboard reads).
export interface DailyMetrics {
  store_id: string;
  local_date: string; // YYYY-MM-DD
  total_calls: number;
  appointments_booked: number;
  eligible_calls: number;
  booking_pct: number | null;
  ai_spend: number | null;
  cost_per_booking: number | null;
  transfers: number;
  failed_transfers: number;
  dropped_calls: number;
  callbacks_needed: number;
  recovered_count: number;
  secret_shopper_score: number | null;
  intent_breakdown: Record<string, number>;
  updated_at: string;
}

// A single computed metric value ready to render on a card.
export interface MetricValue {
  key: string;
  label: string;
  unit: MetricUnit | null;
  good_direction: GoodDirection;
  value: number | null; // null => "Awaiting data" (never render a fake 0)
  previous: number | null;
  awaiting: boolean; // true when there is no source feeding this metric yet
  estimated?: boolean; // value is a labeled estimate (e.g. AI spend before the billing CSV lands)
}

export interface IntentSlice {
  key: string; // e.g. "scheduling" (from topic-scheduling)
  label: string; // "Scheduling"
  count: number;
  pct: number;
}

export interface TrendPoint {
  local_date: string;
  total_calls: number;
  appointments_booked: number;
}

export interface StoreBookings {
  store_id: string;
  name: string;
  appointments_booked: number;
}

export interface CallbackRow {
  time: string;
  intent: string | null;
  status: string;
}

export interface RecoveredRow {
  time: string;
  intent: string | null;
  outcome: string;
  value: number | null;
}
