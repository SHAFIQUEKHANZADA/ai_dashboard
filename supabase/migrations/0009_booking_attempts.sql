-- Booking attempts per store-day: calls where the customer reached a booking
-- DECISION (booked / callback-needed / dropped), excluding pure-info and
-- no-transcript calls. It is the denominator for the "appointment-specific"
-- conversion Reid asked for (booked ÷ booking attempts ≈ 80%), shown alongside
-- overall conversion (booked ÷ all calls). Populated by esther_ingest.rollup.
alter table esther_daily_metrics add column if not exists booking_attempts integer;

-- Split the single "Appointment Conversion Rate" (booked ÷ eligible) into the two
-- numbers Reid asked for, and renumber the headline row so nothing is stranded.
update esther_metric_definitions set enabled = false where key = 'booking_pct';
update esther_metric_definitions set sort_order = 5 where key = 'containment_rate';
update esther_metric_definitions set sort_order = 6 where key = 'cost_per_booking';
update esther_metric_definitions set sort_order = 7 where key = 'ai_spend';

insert into esther_metric_definitions (key, label, unit, good_direction, display_group, sort_order, formula, enabled)
values
  ('conversion_overall', 'Overall Conversion', 'percent', 'up', 'headline', 3,
   'appointments_booked / nullif(total_calls,0)', true),
  ('conversion_appointment', 'Appointment Conversion', 'percent', 'up', 'headline', 4,
   'appointments_booked / nullif(booking_attempts,0)', true)
on conflict (key) do update set
  label = excluded.label, unit = excluded.unit, good_direction = excluded.good_direction,
  display_group = excluded.display_group, sort_order = excluded.sort_order,
  formula = excluded.formula, enabled = true;
