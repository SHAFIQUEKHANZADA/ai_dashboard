-- Secret Shopper scoring (Reid's #7). The QA "shop" calls come from the qa-line
-- test personas (Athena = Service, Hermes = Sales) that call each store's Esther
-- line. Each such call's post-call summary is graded 0–100 by Claude against a
-- fixed rubric, and the result is cached here keyed by the call's stable
-- ghl_message_id so a call is graded exactly once (the 5-min window rebuild never
-- re-charges it). The Secret Shopper Score card averages these.
create table if not exists esther_qa_scores (
  ghl_message_id text primary key,
  store_id       uuid,
  local_date     date not null,
  department     text,        -- service / sales (which line was shopped)
  score          integer,     -- 0..100 overall
  breakdown      jsonb,       -- per-criterion sub-scores + a one-line note
  model          text,
  graded_at      timestamptz not null default now()
);

create index if not exists esther_qa_scores_date_idx on esther_qa_scores (local_date);
