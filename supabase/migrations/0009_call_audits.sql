-- Drift audit of Esther's calls (Reid's "I want to know the second it happens").
--
-- One row per call, keyed by the same stable ghl_message_id the classifier uses,
-- so the 5-minute sync's window rebuild never re-audits — and never re-charges —
-- a call it has already seen.
--
-- Unlike esther_call_classifications (which reads the post-call summary), this
-- reads the FULL transcript: a summary cannot show a greeting fired twice, a
-- goodbye said mid-call, or the agent narrating its own reasoning.

create table if not exists esther_call_audits (
  ghl_message_id  text primary key,
  store_id        uuid references esther_stores(id),
  local_date      date,

  call_ok         boolean,
  -- ok | warn | critical. This is the alerting contract, not a label:
  -- critical is what may page Reid, warn waits for the daily digest.
  severity        text,
  -- the failure codes, for cheap counting on the dashboard
  failures        text[] not null default '{}',
  -- the full findings: [{code, quote, at_sec, why}, ...]
  detail          jsonb,

  booked              boolean,
  transfer_requested  boolean,
  transfer_connected  boolean,
  headline            text,
  -- model's own 0..1 confidence; alerting is gated on this
  confidence      real,

  -- set when an alert actually went out, so a retry or a window rebuild can
  -- never text the same failure twice. NULL means "not alerted".
  alerted_at      timestamptz,

  model           text,
  audited_at      timestamptz not null default now()
);

-- the dashboard card: today's failures by store
create index if not exists esther_call_audits_store_date_idx
  on esther_call_audits (store_id, local_date);
-- "what went wrong recently" — the digest query
create index if not exists esther_call_audits_severity_idx
  on esther_call_audits (severity, audited_at desc);
-- counting individual codes over a window
create index if not exists esther_call_audits_failures_gin
  on esther_call_audits using gin (failures);

-- Calls whose speakers could not be identified are recorded so they are not
-- retried forever, and so the share of unauditable calls stays visible rather
-- than silently shrinking the denominator.
comment on column esther_call_audits.severity is
  'ok | warn | critical | unlabelled (speakers could not be identified — not audited)';
