-- Esther AI Performance Dashboard — Phase 1 schema
-- Runs on the SHARED dispatch Supabase project, so every object is namespaced
-- `esther_` to guarantee it never collides with or clobbers the live 3D Dispatch
-- app (its tables, functions, triggers, or auth). Auth users (auth.users) are
-- shared; esther_profiles holds each user's role *in this dashboard* only.

-- ── Stores ────────────────────────────────────────────────
create table if not exists esther_stores (
  id                  uuid primary key default gen_random_uuid(),
  key                 text unique not null,        -- mcgrath_honda_stcharles
  name                text not null,
  ghl_location_id     text unique,
  mykaarma_dealer_key text,
  timezone            text not null default 'America/Chicago',
  active              boolean not null default true,
  sort_order          int not null default 0,
  created_at          timestamptz not null default now()
);

-- ── Users & access ────────────────────────────────────────
do $$ begin
  create type esther_user_role as enum ('admin', 'group', 'store');
exception when duplicate_object then null; end $$;

create table if not exists esther_profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text,
  email      text,
  role       esther_user_role not null default 'store',
  created_at timestamptz not null default now()
);

create table if not exists esther_user_stores (
  user_id  uuid references esther_profiles(id) on delete cascade,
  store_id uuid references esther_stores(id)   on delete cascade,
  primary key (user_id, store_id)
);

-- ── Raw call facts (one row per call) ─────────────────────
create table if not exists esther_calls (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references esther_stores(id),
  ghl_conversation_id text,
  ghl_contact_id      text,
  ghl_message_id      text unique,
  started_at          timestamptz not null,
  local_date          date not null,
  duration_sec        int,
  direction           text,
  department          text,                   -- service | sales | null
  outcome             text,                   -- booked | callback_needed | info_only | dropped | no_transcript
  intent              text,                   -- from topic-* tag
  transferred         boolean not null default false,
  transfer_succeeded  boolean,
  callback_needed     boolean not null default false,
  needs_attention     boolean not null default false,
  tags                text[] not null default '{}',
  summary             text,
  raw                 jsonb,
  created_at          timestamptz not null default now()
);
create index if not exists esther_calls_store_date_idx on esther_calls (store_id, local_date);
create index if not exists esther_calls_tags_gin on esther_calls using gin (tags);

-- ── Appointments (from myKaarma) ──────────────────────────
create table if not exists esther_appointments (
  id                        uuid primary key default gen_random_uuid(),
  store_id                  uuid not null references esther_stores(id),
  mykaarma_appointment_uuid text unique,
  customer_uuid             text,
  customer_name             text,
  vehicle                   text,
  service                   text,
  start_time                timestamptz not null,
  local_date                date not null,
  source                    text not null,     -- ai | dms | online
  estimated_value           numeric(10,2),
  call_id                   uuid references esther_calls(id),
  created_at                timestamptz not null default now()
);
create index if not exists esther_appts_store_date_source_idx on esther_appointments (store_id, local_date, source);

-- ── AI spend ──────────────────────────────────────────────
create table if not exists esther_ai_spend (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references esther_stores(id),
  local_date date not null,
  amount_usd numeric(10,2) not null,
  source     text,
  unique (store_id, local_date, source)
);

-- ── Secret shopper ────────────────────────────────────────
create table if not exists esther_secret_shopper_scores (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references esther_stores(id),
  local_date date not null,
  score      numeric(2,1) not null check (score between 0 and 5),
  reviewer   text,
  call_id    uuid references esther_calls(id),
  notes      text,
  created_at timestamptz not null default now()
);

-- ── Recovered opportunities ───────────────────────────────
create table if not exists esther_recovered_opportunities (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references esther_stores(id),
  local_date       date not null,
  original_call_id uuid references esther_calls(id),
  recovery_call_id uuid references esther_calls(id),
  intent           text,
  outcome          text,
  value            numeric(10,2),
  recovered_at     timestamptz not null
);

-- ── Pre-aggregated daily rollup (what the dashboard reads) ─
create table if not exists esther_daily_metrics (
  store_id             uuid not null references esther_stores(id),
  local_date           date not null,
  total_calls          int  not null default 0,
  appointments_booked  int  not null default 0,
  eligible_calls       int  not null default 0,
  booking_pct          numeric(5,2),
  ai_spend             numeric(10,2),
  cost_per_booking     numeric(10,2),
  transfers            int  not null default 0,
  failed_transfers     int  not null default 0,
  dropped_calls        int  not null default 0,
  callbacks_needed     int  not null default 0,
  recovered_count      int  not null default 0,
  secret_shopper_score numeric(2,1),
  intent_breakdown     jsonb not null default '{}',
  updated_at           timestamptz not null default now(),
  primary key (store_id, local_date)
);

-- ── Customizability ───────────────────────────────────────
create table if not exists esther_metric_definitions (
  key            text primary key,
  label          text not null,
  unit           text,
  good_direction text not null default 'up',
  display_group  text not null,
  sort_order     int  not null default 0,
  formula        text,
  enabled        boolean not null default true
);

create table if not exists esther_dashboard_widgets (
  key        text primary key,
  type       text not null,
  title      text not null,
  subtitle   text,
  config     jsonb not null default '{}',
  sort_order int  not null default 0,
  enabled    boolean not null default true
);

-- ── Access helpers (namespaced; security definer) ─────────
create or replace function esther_can_see_store(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from esther_profiles p
    where p.id = auth.uid()
      and (p.role in ('admin','group')
           or exists (select 1 from esther_user_stores us
                      where us.user_id = p.id and us.store_id = target))
  );
$$;

create or replace function esther_is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from esther_profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- ── Row Level Security ────────────────────────────────────
alter table esther_stores                  enable row level security;
alter table esther_profiles                enable row level security;
alter table esther_user_stores             enable row level security;
alter table esther_calls                   enable row level security;
alter table esther_appointments            enable row level security;
alter table esther_ai_spend                enable row level security;
alter table esther_secret_shopper_scores   enable row level security;
alter table esther_recovered_opportunities enable row level security;
alter table esther_daily_metrics           enable row level security;
alter table esther_metric_definitions      enable row level security;
alter table esther_dashboard_widgets       enable row level security;

drop policy if exists p_read on esther_calls;                   create policy p_read on esther_calls                   for select using (esther_can_see_store(store_id));
drop policy if exists p_read on esther_appointments;            create policy p_read on esther_appointments            for select using (esther_can_see_store(store_id));
drop policy if exists p_read on esther_ai_spend;                create policy p_read on esther_ai_spend                for select using (esther_can_see_store(store_id));
drop policy if exists p_read on esther_secret_shopper_scores;   create policy p_read on esther_secret_shopper_scores   for select using (esther_can_see_store(store_id));
drop policy if exists p_read on esther_recovered_opportunities; create policy p_read on esther_recovered_opportunities for select using (esther_can_see_store(store_id));
drop policy if exists p_read on esther_daily_metrics;           create policy p_read on esther_daily_metrics           for select using (esther_can_see_store(store_id));

drop policy if exists p_read on esther_stores;
create policy p_read on esther_stores for select using (esther_can_see_store(id));

drop policy if exists p_self on esther_profiles;
create policy p_self on esther_profiles for select using (id = auth.uid() or esther_is_admin());

drop policy if exists p_self on esther_user_stores;
create policy p_self on esther_user_stores for select using (user_id = auth.uid() or esther_is_admin());

drop policy if exists p_read on esther_metric_definitions;
create policy p_read on esther_metric_definitions for select using (auth.role() = 'authenticated');
drop policy if exists p_read on esther_dashboard_widgets;
create policy p_read on esther_dashboard_widgets for select using (auth.role() = 'authenticated');

-- Writes are performed by the service-role key (ingestion), which bypasses RLS.

-- ── Seed: stores (all store facts live here — never hardcoded in app code) ──
insert into esther_stores (key, name, ghl_location_id, mykaarma_dealer_key, sort_order) values
  ('mcgrath_honda_stcharles', 'McGrath Honda of St. Charles', 'HU18sX5xyiO7gIs3Bwyx', 'mcgrath_honda_stcharles', 1),
  ('mcgrath_honda_elgin',     'McGrath Honda of Elgin',       'tj3HUTFhDGeHiw2B8HG8', 'mcgrath_honda_elgin',     2),
  ('mcgrath_kia_stcharles',   'McGrath Kia of St. Charles',   'D1vFnxQpq6KVvR2VZYQk', 'mcgrath_kia_stcharles',   3)
on conflict (key) do update
  set name = excluded.name,
      ghl_location_id = coalesce(excluded.ghl_location_id, esther_stores.ghl_location_id),
      mykaarma_dealer_key = excluded.mykaarma_dealer_key,
      sort_order = excluded.sort_order;

-- ── Seed: metric definitions (direction stored, never inferred) ──
insert into esther_metric_definitions (key, label, unit, good_direction, display_group, sort_order, formula) values
  ('total_calls',          'Total Calls',            'count',    'up',   'headline',  1, null),
  ('appointments_booked',  'Appointments Booked',    'count',    'up',   'headline',  2, null),
  ('booking_pct',          'Appointment Conversion Rate', 'percent', 'up', 'headline', 3, 'appointments_booked / nullif(eligible_calls,0)'),
  ('cost_per_booking',     'Cost per Booking',       'currency', 'down', 'headline',  4, 'ai_spend / nullif(appointments_booked,0)'),
  ('ai_spend',             'AI Spend',               'currency', 'up',   'headline',  5, null),
  ('transfers',            'Transfers',              'count',    'up',   'secondary', 6, null),
  ('failed_transfers',     'Failed Transfers',       'count',    'down', 'secondary', 7, null),
  ('dropped_calls',        'Dropped Calls',          'count',    'down', 'secondary', 8, null),
  ('callbacks_needed',     'Callbacks Needed',       'count',    'down', 'secondary', 9, null),
  ('recovered_count',      'Recovered Opportunities','count',    'up',   'secondary', 10, null),
  ('secret_shopper_score', 'Secret Shopper Score',   'score',    'up',   'secondary', 11, null)
on conflict (key) do update
  set label = excluded.label, unit = excluded.unit, good_direction = excluded.good_direction,
      display_group = excluded.display_group, sort_order = excluded.sort_order, formula = excluded.formula;

-- ── Seed: dashboard widgets ──
insert into esther_dashboard_widgets (key, type, title, subtitle, sort_order, config) values
  ('headline_kpis',   'kpi_row', 'Top-line', null, 1, '{"group":"headline"}'),
  ('secondary_kpis',  'kpi_row', 'Operational', null, 2, '{"group":"secondary"}'),
  ('appts_by_store',  'bar',     'Appointments by Store', 'Total appointments booked', 3, '{"hide_when_single_store":true}'),
  ('customer_intent', 'donut',   'Customer Intent', 'Call reason and customer intent', 4, '{"source":"intent_breakdown"}'),
  ('calls_bookings',  'line',    'Daily Calls & Bookings Trend', 'Last 14 days', 5, '{"days":14}'),
  ('recovered',       'table',   'Recovered Opportunities', 'Customers we re-engaged and converted', 6, '{}'),
  ('callbacks',       'table',   'Missed Calls / Callbacks Needed', 'Follow up on these opportunities', 7, '{}'),
  ('transfers_break', 'donut',   'Transfers Breakdown', 'Call transfers to dealership staff', 8, '{}')
on conflict (key) do update
  set type = excluded.type, title = excluded.title, subtitle = excluded.subtitle,
      sort_order = excluded.sort_order, config = excluded.config;
