-- AI Resolution / Containment Rate (Reid's must-have #3).
-- Separate from Appointment Conversion: measures the share of eligible calls
-- Esther resolved on her own (booked / info-only) OR correctly routed to a human
-- (successful transfer) — so "non-converted" calls that were never appointment-
-- eligible don't drag the number down.
--
-- contained_calls is stored so the group view can reweight (Σ contained ÷ Σ eligible)
-- instead of averaging store percentages. The rollup in backend/esther_ingest.py
-- populates both columns.

alter table esther_daily_metrics add column if not exists contained_calls integer;
alter table esther_daily_metrics add column if not exists containment_rate numeric;

-- Make room in the headline row so it sits right after Appointment Conversion Rate.
update esther_metric_definitions set sort_order = 5 where key = 'cost_per_booking';
update esther_metric_definitions set sort_order = 6 where key = 'ai_spend';

insert into esther_metric_definitions (key, label, unit, good_direction, display_group, sort_order, formula, enabled)
values ('containment_rate', 'AI Resolution Rate', 'percent', 'up', 'headline', 4,
        '(resolved + correctly-routed) / nullif(eligible_calls,0)', true)
on conflict (key) do update set
  label = excluded.label, unit = excluded.unit, good_direction = excluded.good_direction,
  display_group = excluded.display_group, sort_order = excluded.sort_order,
  formula = excluded.formula, enabled = true;
