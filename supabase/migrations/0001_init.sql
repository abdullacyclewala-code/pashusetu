-- ============================================================================
-- PashuSetu · 0001_init.sql — Part 0 schema
-- Run in the Supabase SQL Editor (or `supabase db push`).
-- Core tables from MASTER.md §6. Columns are added per-Part, never redesigned.
-- ============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists postgis;
create extension if not exists vector;

-- Enums -----------------------------------------------------------------------
create type user_role as enum ('farmer','pashu_mitra','vet','officer','lab','admin');
create type report_status as enum ('pending','triaged','escalated','closed');
create type case_status as enum ('suspected','confirmed','contained','closed');
create type cluster_status as enum ('active','confirmed','resolved');
create type sample_status as enum ('collected','in_transit','received','resulted');

-- ============================================================================
-- profiles — extends auth.users with role + jurisdiction
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'farmer',
  name text not null,
  phone text,
  language_pref text not null default 'en' check (language_pref in ('en','hi','mr')),
  village text,
  taluka text,
  district text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile from signup metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, phone, language_pref, village, taluka, district)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'farmer'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'language_pref', 'en'),
    new.raw_user_meta_data->>'village',
    new.raw_user_meta_data->>'taluka',
    new.raw_user_meta_data->>'district'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role/jurisdiction helpers (security definer avoids recursive RLS)
create or replace function public.my_role()
returns user_role language sql security definer stable set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.my_district()
returns text language sql security definer stable set search_path = public
as $$ select district from public.profiles where id = auth.uid() $$;

-- ============================================================================
-- Reference tables
-- ============================================================================
create table public.diseases (
  id serial primary key,
  code text unique not null,               -- e.g. 'FMD', 'LSD'
  name_en text not null,
  name_hi text,
  name_mr text,
  species text[] not null,                 -- e.g. {cattle,buffalo}
  symptoms jsonb not null default '[]',    -- canonical symptom keys
  zoonotic boolean not null default false,
  notifiable boolean not null default false,
  seasonality text,
  created_at timestamptz not null default now()
);

create table public.villages (
  id serial primary key,
  name text not null,
  taluka text not null,
  district text not null,
  geo geography(point, 4326)
);

create table public.vets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id),
  name text not null,
  phone text,
  location geography(point, 4326),
  district text,
  taluka text
);

-- ============================================================================
-- Core domain tables
-- ============================================================================
create table public.animals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  tag_id text,                              -- Bharat Pashudhan 12-digit ID (nullable)
  species text not null,
  breed text,
  dob date,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  animal_id uuid references public.animals(id),
  species text not null,
  symptoms jsonb not null default '[]',
  free_text text,
  sick_count int not null default 1,
  dead_count int not null default 0,
  photo_url text,
  geo geography(point, 4326),
  village text,
  taluka text,
  district text,
  status report_status not null default 'pending',
  offline_ts timestamptz,                   -- when captured offline
  created_at timestamptz not null default now()
);

create table public.triage_results (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  disease_candidates jsonb not null default '[]',  -- [{code, score, reasons[]}]
  confidence numeric,
  urgency text check (urgency in ('low','medium','high','critical')),
  advisory_text text,
  advisory_lang text default 'en',
  notifiable_flag boolean not null default false,
  source text not null default 'rule_engine' check (source in ('rule_engine','image_model','both')),
  created_at timestamptz not null default now()
);

create table public.clusters (
  id uuid primary key default gen_random_uuid(),
  centroid geography(point, 4326),
  radius_km numeric,
  disease_guess text,
  case_count int not null default 0,
  first_seen timestamptz,
  last_seen timestamptz,
  status cluster_status not null default 'active',
  district text
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id),
  disease_id int references public.diseases(id),
  status case_status not null default 'suspected',
  assigned_vet_id uuid references public.vets(id),
  severity text,
  district text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.samples (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  barcode text unique,
  lab_id uuid references public.profiles(id),
  result text,
  custody_json jsonb not null default '[]',
  status sample_status not null default 'collected',
  created_at timestamptz not null default now()
);

create table public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  vaccine text not null,
  dose_no int not null default 1,
  date date not null,
  administered_by text,
  campaign text
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  audience text not null default 'officer',       -- officer | farmer | all
  district text,
  channel text not null default 'in_app',
  message_json jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Syndromic dairy signal input (flagship novelty — Part 8)
create table public.milk_collections (
  id uuid primary key default gen_random_uuid(),
  dairy_id text not null,
  village text not null,
  block text,
  date date not null,
  species text not null default 'cattle',
  avg_yield_kg numeric not null,
  animals_count int not null
);

-- Indexes ---------------------------------------------------------------------
create index reports_geo_idx on public.reports using gist (geo);
create index reports_created_idx on public.reports (created_at desc);
create index reports_district_idx on public.reports (district);
create index milk_village_date_idx on public.milk_collections (village, date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Farmers see their own data; officers their jurisdiction; admins everything.
-- (Stubs per MASTER §6 — tightened per-Part as features land.)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.animals enable row level security;
alter table public.reports enable row level security;
alter table public.triage_results enable row level security;
alter table public.clusters enable row level security;
alter table public.cases enable row level security;
alter table public.samples enable row level security;
alter table public.vaccinations enable row level security;
alter table public.vets enable row level security;
alter table public.alerts enable row level security;
alter table public.milk_collections enable row level security;
alter table public.diseases enable row level security;
alter table public.villages enable row level security;

-- profiles
create policy "read own profile" on public.profiles
  for select using (id = auth.uid() or public.my_role() in ('officer','admin'));
create policy "update own profile" on public.profiles
  for update using (id = auth.uid());

-- reference data readable by any signed-in user
create policy "diseases readable" on public.diseases for select to authenticated using (true);
create policy "villages readable" on public.villages for select to authenticated using (true);
create policy "vets readable" on public.vets for select to authenticated using (true);

-- animals: owner CRUD, officials read within district (via join in later parts)
create policy "animals owner all" on public.animals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "animals officials read" on public.animals
  for select using (public.my_role() in ('vet','officer','admin'));

-- reports: reporter CRUD-own, officials read jurisdiction
create policy "reports own" on public.reports
  for all using (reporter_id = auth.uid()) with check (reporter_id = auth.uid());
create policy "reports officials read" on public.reports
  for select using (
    public.my_role() = 'admin'
    or (public.my_role() in ('vet','officer','lab') and district = public.my_district())
  );

-- triage results: visible to the reporter and officials
create policy "triage visible" on public.triage_results
  for select using (
    exists (select 1 from public.reports r where r.id = report_id and r.reporter_id = auth.uid())
    or public.my_role() in ('vet','officer','lab','admin')
  );

-- clusters / cases / samples / alerts: officials
create policy "clusters officials" on public.clusters
  for select using (public.my_role() in ('vet','officer','lab','admin'));
create policy "cases officials" on public.cases
  for all using (public.my_role() in ('vet','officer','lab','admin'));
create policy "samples officials" on public.samples
  for all using (public.my_role() in ('vet','officer','lab','admin'));
create policy "alerts read" on public.alerts
  for select to authenticated using (true);

-- vaccinations: via animal ownership, officials read
create policy "vaccinations owner" on public.vaccinations
  for all using (
    exists (select 1 from public.animals a where a.id = animal_id and a.owner_id = auth.uid())
  );
create policy "vaccinations officials read" on public.vaccinations
  for select using (public.my_role() in ('vet','officer','admin'));

-- milk collections: officials only (aggregate dairy data)
create policy "milk officials" on public.milk_collections
  for select using (public.my_role() in ('officer','admin'));
