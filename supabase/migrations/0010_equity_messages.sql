-- Appraisal conversations (Reid, 22 Sep: "It's hard to find the conversations
-- and if we had 100 come in today how many got the message").
--
-- esther_equity_appraisals already records the people who said YES. It cannot
-- answer Reid's question, because the question is about the DENOMINATOR: who was
-- texted at all, who answered, who ignored it. The send happens inside GHL — our
-- endpoint only rules on eligibility and hands back the wording — so nothing on
-- our side has ever recorded that a text went out.
--
-- This table is that record, rebuilt from the GHL conversation itself. One row
-- per customer per day: the text we sent, the reply we got, and the whole thread
-- so the dashboard can show it as it reads on the phone.
--
-- The thread is stored rather than linked because Reid's complaint was that the
-- conversations are hard to FIND in GHL. Re-fetching per page view would be slow
-- and would break entirely once GHL's history rolls off.

create table if not exists esther_equity_messages (
  ghl_contact_id  text not null,
  store_id        uuid references esther_stores(id),
  local_date      date not null,

  customer_name   text,
  phone           text,

  sent_at         timestamptz,          -- when the opener went out
  replied_at      timestamptz,          -- first inbound after it, null = ignored
  reply_text      text,                 -- what they actually said back

  -- no_reply | engaged | yes | value_only | declined | opted_out
  --
  -- Derived from the STORE's own follow-ups, not from guessing at the customer's
  -- words: the equity connector sends a DIFFERENT scripted message for each
  -- branch, so the presence of CONFIRM_MESSAGE in the thread IS the yes. That
  -- keeps this in step with the flow instead of re-litigating intent.
  outcome         text not null default 'no_reply',

  msg_count       integer not null default 0,
  thread          jsonb,                -- [{at, direction, body}, ...]

  synced_at       timestamptz not null default now(),

  -- One conversation per customer per day. A customer texted on two separate
  -- visits is two rows; a chatty thread on one visit is still one.
  primary key (ghl_contact_id, local_date)
);

-- The daily view: "who got the message today"
create index if not exists esther_equity_messages_store_date_idx
  on esther_equity_messages (store_id, local_date desc);
-- The funnel: counting outcomes over a range
create index if not exists esther_equity_messages_outcome_idx
  on esther_equity_messages (local_date, outcome);
