-- Appraisal Scheduled (Reid, 19 Sep: "Can we get an alert when somebody says
-- yes to the appraisal" / "Yes and add to dashboard Appraisal Scheduled").
--
-- One row per service-drive customer who said YES to a trade value while they
-- were in for service. Written directly by the equity connector
-- (mykaarma/equity.py) at the moment the customer replies, NOT by the nightly
-- rollup -- Reid watches this while customers are physically in the lounge, so
-- a number that lags the 15-minute ingest is useless to him.
--
-- Same pattern as esther_qa_scores: its own table, read straight by the card,
-- so it never waits on a rollup.
--
-- wants_options is the second yes ("shall someone come and talk to you?").
-- Keeping both on one row is what makes the follow-up question answerable:
-- of everyone who wanted a number, how many agreed to a conversation.

create table if not exists esther_equity_appraisals (
  id             bigserial primary key,
  store_id       uuid references esther_stores(id),
  dealer_key     text,                 -- kept even when the store isn't mapped yet
  phone          text not null,
  customer_name  text,
  vehicle        text,
  priority_score integer,
  priority_band  text,                 -- hot / warm / cold
  appointment_time text,
  local_date     date not null,
  scheduled_at   timestamptz not null default now(),

  wants_options  boolean not null default false,   -- said yes to the 2nd question
  options_at     timestamptz,
  claimed_by     text,                             -- salesperson who took it
  claimed_at     timestamptz,
  outcome        text                              -- presented / sold / no_deal
);

-- One appraisal per customer per day. A customer who replies twice on the same
-- visit is one appraisal, not two -- otherwise a chatty thread inflates the
-- number Reid is being measured on.
--
-- Keyed on dealer_key rather than store_id so PostgREST can target it with
-- on_conflict (it cannot target an expression index, and store_id is nullable
-- until a store is mapped in esther_stores). dealer_key is always known by the
-- connector that writes the row.
alter table esther_equity_appraisals
  alter column dealer_key set not null;

create unique index if not exists esther_equity_appraisals_dedupe_idx
  on esther_equity_appraisals (dealer_key, phone, local_date);

create index if not exists esther_equity_appraisals_date_idx
  on esther_equity_appraisals (local_date);

insert into esther_metric_definitions
  (key, label, unit, good_direction, display_group, sort_order, formula, enabled)
values
  ('appraisals_scheduled', 'Appraisals Scheduled', 'count', 'up', 'secondary', 12,
   'service customers who said yes to a trade value that day', true)
on conflict (key) do update set
  label = excluded.label, unit = excluded.unit,
  good_direction = excluded.good_direction, display_group = excluded.display_group,
  sort_order = excluded.sort_order, formula = excluded.formula, enabled = true;
