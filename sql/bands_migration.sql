-- Akro — Multi-band migration
-- Run this AFTER schema.sql in the Supabase SQL editor

-- ── bands ─────────────────────────────────────────────────────────────────────
create table if not exists bands (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  plan       text not null default 'solo',
  logo_url   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_bands_updated_at before update on bands
  for each row execute function set_updated_at();

-- index for fast per-user queries
create index if not exists bands_user_id_idx on bands(user_id);

-- ── add band_id column to every data table ────────────────────────────────────
alter table company_profile    add column if not exists band_id uuid references bands(id) on delete cascade;
alter table members            add column if not exists band_id uuid references bands(id) on delete cascade;
alter table contractors        add column if not exists band_id uuid references bands(id) on delete cascade;
alter table events             add column if not exists band_id uuid references bands(id) on delete cascade;
alter table expenses           add column if not exists band_id uuid references bands(id) on delete cascade;
alter table transport_entries  add column if not exists band_id uuid references bands(id) on delete cascade;
alter table checklist_items    add column if not exists band_id uuid references bands(id) on delete cascade;
alter table songs              add column if not exists band_id uuid references bands(id) on delete cascade;
alter table setlists           add column if not exists band_id uuid references bands(id) on delete cascade;
alter table equipment          add column if not exists band_id uuid references bands(id) on delete cascade;
alter table show_equipment     add column if not exists band_id uuid references bands(id) on delete cascade;
alter table budgets            add column if not exists band_id uuid references bands(id) on delete cascade;
alter table rehearsals         add column if not exists band_id uuid references bands(id) on delete cascade;
alter table collaborators      add column if not exists band_id uuid references bands(id) on delete cascade;

-- unique constraint so company_profile upsert works by band_id
alter table company_profile
  add constraint if not exists company_profile_band_id_unique unique (band_id);

-- indexes for common filter pattern
create index if not exists members_band_id_idx       on members(band_id);
create index if not exists events_band_id_idx         on events(band_id);
create index if not exists expenses_band_id_idx       on expenses(band_id);
create index if not exists contractors_band_id_idx    on contractors(band_id);
create index if not exists songs_band_id_idx          on songs(band_id);
create index if not exists equipment_band_id_idx      on equipment(band_id);
create index if not exists budgets_band_id_idx        on budgets(band_id);
create index if not exists rehearsals_band_id_idx     on rehearsals(band_id);
create index if not exists collaborators_band_id_idx  on collaborators(band_id);
