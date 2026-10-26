-- Varmepumperådgiveren – initial schema
-- All writes go through server actions using the service role. RLS is enabled
-- on every table with NO public policies, so the anon key can read/write nothing.

create extension if not exists "pgcrypto";

create type lead_status as enum ('new', 'contacted', 'inspection_booked', 'won', 'lost');
create type lead_segment as enum ('privat', 'sommerhus', 'erhverv');
create type lead_tier as enum ('A', 'B', 'C', 'D');

-- Anonymous wizard sessions (save & resume, funnel analytics)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  segment lead_segment,
  current_step int not null default 0,
  max_step int not null default 0,
  answers jsonb not null default '{}'::jsonb,
  embedded boolean not null default false,
  utm jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index sessions_started_at_idx on sessions (started_at desc);

create table leads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions (id) on delete set null,
  report_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  name text not null,
  email text not null,
  phone text,
  segment lead_segment not null,
  contact_consent boolean not null,
  marketing_consent boolean not null default false,
  consent_text_version text not null,
  contact_preference text,
  preferred_date text,
  timeline text,
  wants_inspection boolean not null default false,
  wants_service boolean not null default false,
  message text,
  status lead_status not null default 'new',
  flags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_created_at_idx on leads (created_at desc);
create index leads_status_idx on leads (status);

create table lead_profiles (
  lead_id uuid primary key references leads (id) on delete cascade,
  address_text text,
  address_id text,
  postal_code text,
  city text,
  area_m2 numeric,
  year_built int,
  house_type text,
  floors int,
  bbr_prefilled boolean,
  heating_current text,
  fjernvarme_available text,
  consumption_value numeric,
  consumption_unit text,
  windows text,
  roof_insulation text,
  wall_insulation text,
  draughts text,
  emitter_type text,
  radiator_size text,
  warm_at_low_temp text,
  household_size int,
  hot_water_profile text,
  garden_size text,
  outdoor_placement text,
  neighbour_distance text,
  noise_sensitive boolean,
  business_type text,
  business_needs text[],
  business_size text,
  business_urgency text,
  business_existing text,
  business_refrigerant text,
  company_name text,
  cvr text,
  raw jsonb not null
);

create table lead_scores (
  lead_id uuid primary key references leads (id) on delete cascade,
  total int not null,
  fit int,
  value int,
  intent int,
  data_quality int,
  tier lead_tier not null,
  disqualified boolean not null default false,
  breakdown jsonb not null,
  model_version text not null,
  created_at timestamptz not null default now()
);
create index lead_scores_tier_idx on lead_scores (tier);

create table recommendations (
  lead_id uuid primary key references leads (id) on delete cascade,
  primary_solution jsonb not null,
  alternatives jsonb not null default '[]'::jsonb,
  reason text,
  heat_demand_kwh int,
  heat_demand_source text,
  size_kw numeric,
  flow_temp text,
  price_low int,
  price_high int,
  subsidy int,
  possible_deduction int,
  net_low int,
  net_high int,
  running_cost int,
  current_cost int,
  saving_per_year int,
  payback_low numeric,
  payback_high numeric,
  co2_reduction_kg int,
  economy jsonb,
  talking_points jsonb,
  config_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table knowledge_cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  step int not null,
  title text not null,
  body_md text not null,
  illustration text,
  sort_order int not null default 0,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);
create index knowledge_cards_step_idx on knowledge_cards (step, sort_order);

create table faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer_md text not null,
  sort_order int not null default 0,
  published boolean not null default true
);

-- One row per config section (see lib/config/defaults.ts). Values are deep-merged onto the defaults.
create table config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

create table events (
  id bigint generated always as identity primary key,
  session_id uuid references sessions (id) on delete cascade,
  type text not null check (type in ('step_view', 'step_complete', 'card_open', 'cta_click', 'lead_submitted')),
  step text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index events_session_idx on events (session_id);
create index events_type_created_idx on events (type, created_at desc);

-- updated_at triggers
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger sessions_updated_at before update on sessions for each row execute function set_updated_at();
create trigger leads_updated_at before update on leads for each row execute function set_updated_at();
create trigger knowledge_cards_updated_at before update on knowledge_cards for each row execute function set_updated_at();
create trigger config_updated_at before update on config for each row execute function set_updated_at();

-- Funnel: how far each session got (drop-off = sessions whose max_step is N and never completed)
create or replace view funnel_steps as
select max_step, segment, count(*) as sessions, count(completed_at) as completed
from sessions
group by max_step, segment;

-- Row-level security: on everywhere, no policies → only the service role can access.
alter table sessions enable row level security;
alter table leads enable row level security;
alter table lead_profiles enable row level security;
alter table lead_scores enable row level security;
alter table recommendations enable row level security;
alter table knowledge_cards enable row level security;
alter table faq enable row level security;
alter table config enable row level security;
alter table events enable row level security;

-- The view runs with the caller's rights so RLS still applies.
alter view funnel_steps set (security_invoker = true);
