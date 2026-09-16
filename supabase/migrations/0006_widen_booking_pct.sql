-- booking_pct was NUMERIC(5,2) (max 999.99). When the conversion numerator and
-- denominator were mismatched, an extreme rate (e.g. 2100%) overflowed the column
-- and crashed the whole store's rollup transaction. The rollup math is now
-- consistent (bookings among eligible ÷ eligible, always ≤ 100), but we widen the
-- column to NUMERIC(6,2) as a safety belt so a bad value can never crash the sync.
alter table esther_daily_metrics
  alter column booking_pct type numeric(6,2);
