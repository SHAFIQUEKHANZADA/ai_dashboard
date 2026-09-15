-- Claude classification of calls (Reid's #1 intent detail, #2 transfer reasons,
-- #4 sentiment, #5 human preference). Keyed by the call's stable ghl_message_id
-- and kept in its own table so the 5-minute call-window rebuild never wipes it —
-- each call is sent to Claude exactly once. Populated by the classifier in
-- backend/app/services/esther_classifier.py, run after each ingest.

create table if not exists esther_call_classifications (
  ghl_message_id  text primary key,
  intent_detail   text,      -- Scheduling / Parts / Warranty / Loaner / Complaint / ...
  transfer_reason text,      -- why a call was transferred (null when not transferred)
  human_requested boolean,   -- customer explicitly asked for a person
  sentiment_open  integer,   -- -100..100 at the start of the call
  sentiment_close integer,   -- -100..100 at the end
  model           text,
  classified_at   timestamptz not null default now()
);

-- The ingest also now stores the call's post-call summary so the classifier can
-- read it (the column already exists on esther_calls; this is a no-op guard).
alter table esther_calls add column if not exists summary text;
