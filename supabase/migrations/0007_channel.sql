-- ============================================================================
-- PashuSetu · 0007_channel.sql — Part 7: farmer channel (WhatsApp / IVR)
--
-- Adds the no-app farmer channel reporting path. A WhatsApp (or IVR) message is
-- parsed into a *normal* `reports` row, so it flows through the SAME triage /
-- cluster / case pipeline as the in-app report — nothing is forked.
--
-- New in this migration:
--   1. reports.source               — channel provenance (app | whatsapp | ivr | iot)
--   2. channel_sessions             — multi-turn interactive (WhatsApp button) state
--   3. channel_messages             — inbound/outbound log (officer inbox + traceability)
--   4. nearest_village(lat,lng)     — reverse-geocode a shared location to a village/district
-- The webhook writes with the service role (bypasses RLS); officers read the log.
-- ============================================================================

-- 1) Channel provenance on reports ------------------------------------------
alter table public.reports
  add column if not exists source text not null default 'app'
  check (source in ('app','whatsapp','ivr','iot'));

-- 2) session state for multi-turn interactive flows --------------------------
create table if not exists public.channel_sessions (
  phone      text primary key,
  channel    text not null default 'whatsapp' check (channel in ('whatsapp','ivr')),
  locale     text not null default 'en' check (locale in ('en','hi','mr')),
  step       text,
  draft      jsonb not null default '{}',
  report_id  uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 3) inbound/outbound message log (the officer inbox) ------------------------
create table if not exists public.channel_messages (
  id           uuid primary key default gen_random_uuid(),
  channel      text not null default 'whatsapp' check (channel in ('whatsapp','ivr')),
  direction    text not null check (direction in ('inbound','outbound')),
  phone        text not null,
  message_type text not null default 'text',
  text         text,
  payload      jsonb not null default '{}',
  report_id    uuid references public.reports(id) on delete set null,
  reply_text   text,
  district     text,
  created_at   timestamptz not null default now()
);

create index if not exists channel_messages_phone_idx
  on public.channel_messages (phone, created_at desc);
create index if not exists channel_messages_district_idx
  on public.channel_messages (district, created_at desc);

-- RLS -----------------------------------------------------------------------
alter table public.channel_sessions enable row level security;
alter table public.channel_messages enable row level security;

-- The webhook inserts/updates with the service role (RLS bypassed). Officers
-- read the log, jurisdiction-scoped by district (admin sees all).
create policy "channel sessions officials" on public.channel_sessions
  for select using (public.my_role() = 'admin');
create policy "channel messages officials" on public.channel_messages
  for select using (
    public.my_role() = 'admin'
    or (public.my_role() in ('officer','lab','vet') and district = public.my_district())
  );

-- Stream to the officer inbox + dashboard in realtime.
alter publication supabase_realtime add table channel_messages;

-- 4) reverse-geocode a shared WhatsApp location to the nearest village --------
create or replace function public.nearest_village(p_lat double precision, p_lng double precision)
returns table (name text, taluka text, district text, distance_km double precision)
language sql stable set search_path = public
as $$
  select v.name, v.taluka, v.district,
         round((st_distance(v.geo::geography, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000.0)::numeric, 2) as distance_km
  from public.villages v
  order by v.geo <-> st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
  limit 1;
$$;
grant execute on function public.nearest_village(double precision, double precision)
  to service_role, anon, authenticated;
