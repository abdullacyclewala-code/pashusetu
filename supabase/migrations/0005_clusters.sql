-- ============================================================================
-- PashuSetu · 0005_clusters.sql — Part 5 · Outbreak cluster detection + alerts
--
-- Problem (PS #3 + novelty #4): a single sick animal is a signal; a *cluster*
-- of similar reports in space+time is an outbreak. This migration detects those
-- clusters automatically with PostGIS and raises a district alert.
--
--   Detector contract (Anchor: "≥3 similar-symptom cases within 5km / 72h"):
--     * comparable reports = same DISTRICТ + same SUSPECTED DISEASE (the
--       rule engine's top candidate — "similar symptoms" decoded as "the same
--       disease explains them").
--     * spatial window  = reports within RADIUS_M (5 km) of a shared centroid.
--     * time window     = the cluster's first→last report spans ≤ WINDOW_H (72 h).
--     * a report that has NO same-disease neighbour within the radius is
--       treated as isolated and never creates a cluster (no orphan rows).
--     * crossing MIN_CASES (3) raises ONE alert per cluster; the alert is
--       idempotent (only created when alert_created_at is still NULL).
--
-- Run paths (both idempotent):
--   1. Realtime — AFTER INSERT/UPDATE on triage_results fires
--      detect_clusters(district) so a new report that finishes triage updates
--      clusters/streams an alert immediately.
--   2. Sweep — a pg_cron job runs detect_clusters() every 15 min: catches
--      anything missed and retires clusters whose newest member has aged out.
--
-- No redesign of earlier tables; clusters/alerts only get new columns.
-- ============================================================================

-- ── extend clusters: membership + alert bookkeeping + map overlay ───────────
alter table public.clusters
  add column if not exists member_ids      uuid[]      not null default '{}',
  add column if not exists village         text,
  add column if not exists severity        text        not null default 'warning',
  add column if not exists alert_created_at timestamptz,
  add column if not exists created_at      timestamptz not null default now();

-- FK so the officer dashboard embeds localised disease names via PostgREST.
alter table public.clusters
  drop constraint if exists clusters_disease_guess_fkey;
alter table public.clusters
  add constraint clusters_disease_guess_fkey
  foreign key (disease_guess) references public.diseases(code)
  on delete set null;

-- PostgREST computed lat/lng for cluster centroids (map overlay + list).
create or replace function public.lat(c public.clusters)
returns double precision language sql stable
as $$ select st_y(c.centroid::geometry) $$;

create or replace function public.lng(c public.clusters)
returns double precision language sql stable
as $$ select st_x(c.centroid::geometry) $$;

-- ============================================================================
-- Detect + upsert clusters
-- ============================================================================
create or replace function public.detect_clusters(
  p_window_hours int default 72,
  p_radius_m     int default 5000,
  p_min_cases    int default 3,
  p_district     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_district text;
  v_disease  text;
  v_rec      record;
  v_cluster  public.clusters%rowtype;
  v_members  uuid[];
  v_centroid geography(point,4326);
  v_radius   numeric;
  v_count    int;
begin
  -- retire clusters whose newest member has aged out of the detection window
  update public.clusters c
     set status = 'resolved'
   where c.status = 'active'
     and c.last_seen < now() - make_interval(hours => p_window_hours);

  -- iterate every (district, suspected disease) with fresh geo-tagged reports
  for v_district, v_disease in
    select r.district, tr.disease_candidates->0->>'code'
    from public.reports r
    join public.triage_results tr on tr.report_id = r.id
    where r.geo is not null
      and r.district is not null
      and r.created_at >= now() - make_interval(hours => p_window_hours)
      and tr.disease_candidates->0->>'code' is not null
      and (p_district is null or r.district = p_district)
    group by r.district, tr.disease_candidates->0->>'code'
  loop
    -- one pass over the reports, oldest first → deterministic assignment
    for v_rec in
      select r.id, r.geo, r.created_at
      from public.reports r
      join public.triage_results tr on tr.report_id = r.id
      where r.district = v_district
        and tr.disease_candidates->0->>'code' = v_disease
        and r.geo is not null
        and r.created_at >= now() - make_interval(hours => p_window_hours)
      order by r.created_at asc, r.id asc
    loop
      -- already absorbed into an active cluster? skip.
      if exists (
        select 1 from public.clusters c
        where c.status = 'active' and v_rec.id = any(c.member_ids)
      ) then
        continue;
      end if;

      -- 1) try to absorb into an existing nearby cluster
      select c.* into v_cluster
      from public.clusters c
      where c.status = 'active'
        and c.district = v_district
        and c.disease_guess = v_disease
        and c.member_ids is not null
        and st_dwithin(c.centroid, v_rec.geo, p_radius_m)
        and (v_rec.created_at - c.first_seen) <= make_interval(hours => p_window_hours)
        and (c.last_seen - v_rec.created_at) <= make_interval(hours => p_window_hours)
      order by c.case_count desc
      limit 1
      for update;

      if v_cluster.id is not null then
        -- append this report to the cluster
        v_members := array_append(v_cluster.member_ids, v_rec.id);

        update public.clusters c
           set case_count = array_length(v_members, 1),
               member_ids = v_members,
               first_seen = least(c.first_seen, v_rec.created_at),
               last_seen  = greatest(c.last_seen, v_rec.created_at)
         where c.id = v_cluster.id
        returning * into v_cluster;

        -- recompute centroid + max member radius
        select st_centroid(st_collect(geo::geometry))::geography(point,4326)
          into v_centroid
        from public.reports where id = any(v_members);
        select max(st_distance(geo, v_centroid)) / 1000.0 into v_radius
        from public.reports where id = any(v_members);

        update public.clusters
           set centroid  = coalesce(v_centroid, centroid),
               radius_km = greatest(coalesce(v_radius, 0), radius_km)
         where id = v_cluster.id;

      else
        -- 2) seed a NEW cluster: this report + any nearby, unassigned,
        --    same-disease reports inside the window. Isolated reports are skipped.
        select array_agg(m.id order by m.created_at, m.id)
          into v_members
        from (
          select r2.id, r2.created_at
          from public.reports r2
          join public.triage_results tr2 on tr2.report_id = r2.id
          where r2.district = v_district
            and tr2.disease_candidates->0->>'code' = v_disease
            and r2.geo is not null
            and st_dwithin(r2.geo, v_rec.geo, p_radius_m)
            and r2.created_at between v_rec.created_at
                and v_rec.created_at + make_interval(hours => p_window_hours)
            and not exists (
              select 1 from public.clusters c
              where c.status = 'active' and r2.id = any(c.member_ids)
            )
        ) m;

        if v_members is not null and array_length(v_members, 1) >= 2 then
          select st_centroid(st_collect(geo::geometry))::geography(point,4326)
            into v_centroid
          from public.reports where id = any(v_members);
          select max(st_distance(geo, v_centroid)) / 1000.0 into v_radius
          from public.reports where id = any(v_members);

          insert into public.clusters
            (centroid, radius_km, disease_guess, case_count, first_seen,
             last_seen, status, district, member_ids, severity, village)
          values
            (v_centroid, coalesce(v_radius, 0), v_disease, array_length(v_members, 1),
             v_rec.created_at,
             (select max(created_at) from public.reports where id = any(v_members)),
             'active', v_district, v_members,
             (select case when notifiable or zoonotic then 'critical' else 'warning' end
                from public.diseases where code = v_disease),
             (select village from public.reports where id = any(v_members)
                order by created_at asc limit 1))
          returning * into v_cluster;
        else
          continue; -- isolated report — not an outbreak
        end if;
      end if;

      -- raise the outbreak alert the moment this cluster crosses the threshold
      select case_count, alert_created_at
        into v_count, v_cluster.alert_created_at
      from public.clusters where id = v_cluster.id;

      if v_count >= p_min_cases and v_cluster.alert_created_at is null then
        perform public.create_cluster_alert(v_cluster.id);
        update public.clusters set alert_created_at = now() where id = v_cluster.id;
      end if;
    end loop;
  end loop;
end;
$$;

-- ============================================================================
-- Raise a district alert for a cluster (localised en/hi/mr, idempotent per
-- cluster via alert_created_at). Messages are stored as structured JSON so the
-- UI can render a severity chip + case facts AND pick the right language.
-- ============================================================================
create or replace function public.create_cluster_alert(p_cluster uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.clusters%rowtype;
  d public.diseases%rowtype;
  v_village text;
  v_message jsonb;
  v_sev text;
  v_id uuid;
begin
  select * into c from public.clusters where id = p_cluster;
  if not found then return null; end if;

  select * into d from public.diseases where code = c.disease_guess;
  select r.village
    into v_village
  from public.reports r
  where r.id = any(c.member_ids)
  order by r.created_at asc
  limit 1;

  v_sev := coalesce(
    (select case when notifiable or zoonotic then 'critical' else 'warning' end
       from public.diseases where code = c.disease_guess),
    'warning');

  v_message := jsonb_build_object(
    'cluster_id',        c.id::text,
    'disease',           c.disease_guess,
    'disease_name_en',   coalesce(d.name_en, c.disease_guess),
    'disease_name_hi',   coalesce(d.name_hi, d.name_en, c.disease_guess),
    'disease_name_mr',   coalesce(d.name_mr, d.name_en, c.disease_guess),
    'case_count',        c.case_count,
    'district',          c.district,
    'village',           coalesce(v_village, c.district),
    'radius_km',         c.radius_km,
    'en', 'Possible outbreak cluster: ' || coalesce(d.name_en, c.disease_guess)
        || ' · ' || c.case_count || ' cases near ' || coalesce(v_village, c.district, 'the area')
        || '. Field verification advised.',
    'hi', 'संभावित प्रकोप क्लस्टर: ' || coalesce(d.name_hi, d.name_en, c.disease_guess)
        || ' · ' || c.case_count || ' मामले, ' || coalesce(v_village, c.district, 'क्षेत्र')
        || ' के पास। फील्ड सत्यापन की सलाह दी जाती है।',
    'mr', 'संभावित प्रादुर्भाव क्लस्टर: ' || coalesce(d.name_mr, d.name_en, c.disease_guess)
        || ' · ' || c.case_count || ' प्रकरणे, ' || coalesce(v_village, c.district, 'क्षेत्र')
        || ' जवळ. फील्ड पडताळणीचा सल्ला दिला जातो.'
  );

  insert into public.alerts (severity, audience, district, channel, message_json)
  values (v_sev, 'all', c.district, 'in_app', v_message)
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================================================
-- Realtime trigger: run detection when a report finishes triage.
-- ============================================================================
create or replace function public.trigger_cluster_detect()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dist text;
begin
  select r.district into v_dist from public.reports r where r.id = new.report_id;
  if v_dist is not null then
    perform public.detect_clusters(p_district => v_dist);
  end if;
  return new;
end;
$$;

drop trigger if exists on_triage_results_cluster on public.triage_results;
create trigger on_triage_results_cluster
  after insert or update on public.triage_results
  for each row execute function public.trigger_cluster_detect();

-- ============================================================================
-- RLS: non-admins scoped to their district.
-- ============================================================================
drop policy if exists "clusters officials" on public.clusters;
create policy "clusters officials" on public.clusters
  for select using (
    public.my_role() = 'admin'
    or (public.my_role() in ('vet','officer','lab') and district = public.my_district())
  );

drop policy if exists "alerts read" on public.alerts;
create policy "alerts read" on public.alerts
  for select to authenticated using (
    public.my_role() = 'admin'
    or (public.my_district() is not null and district = public.my_district())
  );

drop policy if exists "alerts update" on public.alerts;
create policy "alerts update" on public.alerts
  for update to authenticated
  using (public.my_role() = 'admin' or district = public.my_district())
  with check (public.my_role() = 'admin' or district = public.my_district());

-- ============================================================================
-- Realtime: clusters + alerts stream to the officer dashboard and the farmer
-- alert inbox.
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.clusters;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.alerts;
exception when duplicate_object then null;
end $$;

-- ============================================================================
-- Periodic sweep (best-effort; no-ops if pg_cron is unavailable).
-- ============================================================================
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule('cluster-detect');
exception when others then null;
end $$;

do $$
begin
  perform cron.schedule('cluster-detect', '*/15 * * * *', $q$select public.detect_clusters()$q$);
exception when others then null;
end $$;
