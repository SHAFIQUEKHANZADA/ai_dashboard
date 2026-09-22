-- Reid's leadership-pass tightening:
-- Relabel "Cost per Booking" → "AI Cost per Booking" so it stays unambiguous once
-- revenue is added next to it (AI cost vs revenue).
update esther_metric_definitions set label = 'AI Cost per Booking' where key = 'cost_per_booking';
