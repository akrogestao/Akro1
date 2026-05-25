-- Akro Band Manager — Supabase Schema
-- Run this in the Supabase SQL editor

create extension if not exists "pgcrypto";

-- ── updated_at trigger ────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ── company_profile ───────────────────────────────────────────────────────────
create table if not exists company_profile (
  id                    uuid primary key default gen_random_uuid(),
  company_name          text not null default '',
  cnpj                  text not null default '',
  address               text not null default '',
  city                  text not null default '',
  state                 text not null default '',
  phone                 text not null default '',
  email                 text not null default '',
  proposal_validity_days integer not null default 30,
  logo_base64           text,
  brand_color_base      text,
  brand_color_accent    text,
  updated_at            timestamptz not null default now()
);
create trigger trg_company_profile_updated_at before update on company_profile
  for each row execute function set_updated_at();

-- ── members ───────────────────────────────────────────────────────────────────
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text not null default '',
  cache      numeric not null default 0,
  cpf        text not null default '',
  init       text not null default '',
  color      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_members_updated_at before update on members
  for each row execute function set_updated_at();

-- ── contractors ───────────────────────────────────────────────────────────────
create table if not exists contractors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  company    text not null default '',
  role       text not null default '',
  phone      text not null default '',
  email      text not null default '',
  city       text not null default '',
  state      text not null default '',
  lat        double precision,
  lng        double precision,
  notes      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_contractors_updated_at before update on contractors
  for each row execute function set_updated_at();

-- ── events ────────────────────────────────────────────────────────────────────
create table if not exists events (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  local             text not null default '',
  date              text not null default '',
  time              text not null default '',
  end_time          text not null default '',
  value             numeric not null default 0,
  type              text not null default 'Show',
  member_ids        jsonb not null default '[]',
  contractor_ids    jsonb not null default '[]',
  city              text not null default '',
  state             text not null default '',
  lat               double precision,
  lng               double precision,
  notes             text not null default '',
  expenses          jsonb not null default '{"alimentacao":0,"hospedagem":0,"logistica":0}',
  member_payments   jsonb not null default '{}',
  contract_receipt  jsonb not null default '{"paid":false,"partial":false,"paidAmount":null,"paidAt":null,"partialPayments":[]}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_events_updated_at before update on events
  for each row execute function set_updated_at();

-- ── expenses ──────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references events(id) on delete cascade,
  type        text not null default '',
  amount      numeric not null default 0,
  date        text not null default '',
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_expenses_updated_at before update on expenses
  for each row execute function set_updated_at();

-- ── transport_entries (stops + favorite stops) ────────────────────────────────
create table if not exists transport_entries (
  id          uuid primary key default gen_random_uuid(),
  is_favorite boolean not null default false,
  name        text not null default '',
  city        text not null default '',
  state       text not null default '',
  lat         double precision,
  lng         double precision,
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_transport_updated_at before update on transport_entries
  for each row execute function set_updated_at();

-- ── checklist_items ───────────────────────────────────────────────────────────
create table if not exists checklist_items (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references events(id) on delete cascade,
  template_id integer,
  text        text not null,
  done        boolean not null default false,
  done_at     timestamptz,
  is_custom   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_checklist_updated_at before update on checklist_items
  for each row execute function set_updated_at();

-- ── songs ─────────────────────────────────────────────────────────────────────
create table if not exists songs (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  artist          text not null default '',
  key             text not null default '',
  bpm             integer,
  duration        text not null default '',
  notes           text not null default '',
  tags            jsonb not null default '[]',
  play_count      integer not null default 0,
  rehearsal_count integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_songs_updated_at before update on songs
  for each row execute function set_updated_at();

-- ── setlists ──────────────────────────────────────────────────────────────────
create table if not exists setlists (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid references events(id) on delete cascade,
  name       text not null,
  songs      jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_setlists_updated_at before update on setlists
  for each row execute function set_updated_at();

-- ── equipment ─────────────────────────────────────────────────────────────────
create table if not exists equipment (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default '',
  brand       text not null default '',
  model       text not null default '',
  serial      text not null default '',
  notes       text not null default '',
  status      text not null default 'Disponível',
  value       numeric not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_equipment_updated_at before update on equipment
  for each row execute function set_updated_at();

-- ── show_equipment ────────────────────────────────────────────────────────────
create table if not exists show_equipment (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid references events(id) on delete cascade unique,
  equipment_ids jsonb not null default '[]',
  checked_at    timestamptz,
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_show_equipment_updated_at before update on show_equipment
  for each row execute function set_updated_at();

-- ── budgets ───────────────────────────────────────────────────────────────────
create table if not exists budgets (
  id          uuid primary key default gen_random_uuid(),
  status      text not null default 'Rascunho',
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_budgets_updated_at before update on budgets
  for each row execute function set_updated_at();

-- ── rehearsals ────────────────────────────────────────────────────────────────
create table if not exists rehearsals (
  id               uuid primary key default gen_random_uuid(),
  date             text not null default '',
  time             text not null default '',
  location         text not null default '',
  notes            text not null default '',
  status           text not null default 'Agendado',
  songs            jsonb not null default '[]',
  attended_members jsonb not null default '[]',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger trg_rehearsals_updated_at before update on rehearsals
  for each row execute function set_updated_at();

-- ── collaborators ─────────────────────────────────────────────────────────────
create table if not exists collaborators (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null default '',
  pin         text not null default '',
  role        text not null default '',
  avatar      text not null default '',
  permissions jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_collaborators_updated_at before update on collaborators
  for each row execute function set_updated_at();
