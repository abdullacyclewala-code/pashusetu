-- ============================================================================
-- PashuSetu · 0006_case_lab_vaccine.sql — Part 6
-- Case escalation · lab referral (sample + chain-of-custody) · vaccination
-- records + coverage gap · close-the-loop alert to the farmer.
--
-- Drives the full suspected → confirmed → contained → closed journey and the
-- sample chain (collected → in_transit → received → resulted), with an audit
-- trail (case_events) and the fight against coverage gaps.
--
-- No redesign of earlier tables: existing columns are kept, new ones added.
-- ============================================================================

-- ── target a specific farmer for close-the-loop alerts (P6) ────────────────
alter table public.alerts
  add column if not exists user_id uuid references public.profiles(id);

-- ── case life-cycle timestamps + officer note ─────────────────────────────
alter table public.cases
  add column if not exists escalated_at timestamptz,
  add column if not exists contained_at timestamptz,
  add column if not exists closed_at     timestamptz,
  add column if not exists notes         text;

-- ── sample pipeline timestamps / metadata ─────────────────────────────────
alter table public.samples
  add column if not exists collected_at  timestamptz,
  add column if not exists received_at   timestamptz,
  add column if not exists resulted_at   timestamptz,
  add column if not exists specimen_type text not null default 'blood',
  add column if not exists disease_code  text,
  add column if not exists notes         text,
  add column if not exists result_summary text;

-- ============================================================================
-- case_events — immutable audit trail of every decision / transition.
-- ============================================================================
create table if not exists public.case_events (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  event_type  text not null,                 -- assigned | status_changed | sample_created | sample_status | sample_result | note
  from_status text,
  to_status   text,
  note        text,
  actor_id    uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create index if not exists case_events_case_idx on public.case_events (case_id, created_at desc);
alter table public.case_events enable row level security;

-- ============================================================================
-- Helpers
-- ============================================================================
create or replace function public.append_event(
  p_case uuid, p_type text, p_from text, p_to text, p_note text
)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.case_events (case_id, event_type, from_status, to_status, note, actor_id)
  values (p_case, p_type, p_from, p_to, p_note, auth.uid());
end $$;

-- Alert a specific farmer (close-the-loop / containment notice). Idempotent
-- per (user, type) — we don't spam a repeat alert on every status transition.
create or replace function public.create_loop_alert(
  p_user uuid, p_district text, p_type text, p_message jsonb, p_severity text default 'info'
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_type text;
begin
  v_type := coalesce(p_message->>'type', p_type);
  select id into v_id from public.alerts
   where user_id = p_user and coalesce(message_json->>'type','') = v_type
   order by created_at desc limit 1;
  if found then
    return v_id;
  end if;
  insert into public.alerts (severity, audience, district, channel, message_json, user_id)
  values (p_severity, 'farmer', p_district, 'in_app', p_message, p_user)
  returning id into v_id;
  return v_id;
end $$;

-- ============================================================================
-- Case lifecycle RPCs (security definer — officials only, district-checked)
-- ============================================================================

-- Assign a veterinarian to a case.
create or replace function public.case_assign_vet(
  p_case uuid, p_vet uuid
)
returns public.cases
language plpgsql security definer set search_path = public
as $$
declare v_case public.cases;
begin
  if public.my_role() not in ('vet','officer','admin') then
    raise exception 'only vets and officers can assign a vet';
  end if;
  update public.cases
     set assigned_vet_id = p_vet,
         updated_at      = now()
   where id = p_case
     and (public.my_role() = 'admin' or district = public.my_district())
     and status in ('confirmed','suspected','contained')
  returning * into v_case;
  if not found then
    raise exception 'case not found or outside your district, or not actionable';
  end if;
  perform public.append_event(p_case, 'assigned', v_case.status::text, v_case.status::text, 'Vet assigned');
  return v_case;
end $$;

-- Transition a case to a new status, log it, and fire the close-the-loop
-- alert when the animal is contained / the case closed.
create or replace function public.case_set_status(
  p_case uuid, p_status text, p_note text default null
)
returns public.cases
language plpgsql security definer set search_path = public
as $$
declare
  v_case  public.cases;
  v_prev  public.cases%rowtype;
  v_msg   jsonb;
  v_user  uuid;
  v_dist  text;
  v_slug  text;
  v_name_en text;
  v_name_hi text;
  v_name_mr text;
begin
  if public.my_role() not in ('vet','officer','admin') then
    raise exception 'only vets and officers can change case status';
  end if;
  if p_status not in ('confirmed','contained','closed','rejected') then
    raise exception 'invalid status: %', p_status;
  end if;

  select * into v_prev from public.cases where id = p_case;
  if not found then
    raise exception 'case not found';
  end if;
  if public.my_role() <> 'admin' and v_prev.district is distinct from public.my_district() then
    raise exception 'case is outside your district';
  end if;

  -- allowed transitions (keeps the journey sane; re-confirm is allowed)
  if p_status = 'closed'
     and v_prev.status not in ('confirmed','contained') then
    raise exception 'a case can only be closed from confirmed or contained';
  end if;

  update public.cases
     set status       = p_status::case_status,
         escalated_at = coalesce(escalated_at, case when p_status = 'confirmed' then now() end),
         contained_at = case when p_status = 'contained' then now() else contained_at end,
         closed_at    = case when p_status = 'closed' then now() else closed_at end,
         notes        = coalesce(p_note, notes),
         updated_at   = now()
   where id = p_case
  returning * into v_case;

  perform public.append_event(p_case, 'status_changed', v_prev.status::text, p_status, p_note);

  -- reflect on the report
  update public.reports
     set status = case
            when p_status in ('confirmed') then 'escalated'::report_status
            when p_status in ('contained') then 'escalated'::report_status
            when p_status in ('closed','rejected') then 'closed'::report_status
            else status end
   where id = v_prev.report_id;

  -- close-the-loop alert to the reporting farmer
  if p_status in ('contained','closed') then
    select r.reporter_id, r.district,
           coalesce(d.name_en, c.disease_code),
           coalesce(d.name_hi, d.name_en, c.disease_code),
           coalesce(d.name_mr, d.name_en, c.disease_code)
      into v_user, v_dist, v_name_en, v_name_hi, v_name_mr
    from public.cases c
    join public.reports r on r.id = c.report_id
    left join public.diseases d on d.code = c.disease_code
    where c.id = p_case;

    v_slug := coalesce(v_name_en, 'the disease');

    v_msg := jsonb_build_object(
      'case_id', p_case::text,
      'type', 'contained',
      'status', p_status,
      'disease', v_slug,
      'disease_name_en', v_slug,
      'disease_name_hi', coalesce(v_name_hi, v_slug),
      'disease_name_mr', coalesce(v_name_mr, v_slug),
      'en', case when p_status = 'contained'
                 then 'Good news: your case has been contained. Your veterinarian will guide the care of the affected animal.'
                 else 'Your case has been closed. Please contact your veterinarian for follow-up.' end,
      'hi', case when p_status = 'contained'
                 then 'शुभ समाचार: आपका मामला नियंत्रित कर लिया गया है। आपका पशु चिकित्सक प्रभावित पशु की देखभाल में मार्गदर्शन करेंगे।'
                 else 'आपका मामला बंद कर दिया गया है। फॉलो-अप के लिए कृपया अपने पशु चिकित्सक से संपर्क करें।' end,
      'mr', case when p_status = 'contained'
                 then 'शुभ बातमी: तुमचे प्रकरण नियंत्रित केले गेले आहे. तुमचे पशुवैद्य प्रभावित जनावराच्या काळजीत मार्गदर्शन करतील.'
                 else 'तुमचे प्रकरण बंद करण्यात आले आहे. पुढील उपचारासाठी कृपया तुमच्या पशुवैद्याशी संपर्क साधा.' end
    );

    if v_user is not null then
      perform public.create_loop_alert(v_user, v_dist, 'contained', v_msg, 'info');
    end if;
  end if;

  return v_case;
end $$;

-- ============================================================================
-- Sample RPCs — barcode generation + chain-of-custody
-- ============================================================================
create or replace function public.gen_barcode()
returns text language plpgsql
as $$
declare v text;
begin
  v := 'PS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  return v;
end $$;

-- Register a sample against a case (status = collected). Barcode is unique.
create or replace function public.case_create_sample(
  p_case uuid, p_specimen text default 'blood'
)
returns public.samples
language plpgsql security definer set search_path = public
as $$
declare
  v_case   public.cases%rowtype;
  v_sample public.samples;
  v_barcode text;
begin
  if public.my_role() not in ('vet','officer','lab','admin') then
    raise exception 'only vets, officers and labs can register a sample';
  end if;
  select * into v_case from public.cases where id = p_case;
  if not found then raise exception 'case not found'; end if;
  if public.my_role() <> 'admin' and v_case.district is distinct from public.my_district() then
    raise exception 'case is outside your district';
  end if;
  if v_case.status = 'closed' then
    raise exception 'cannot collect a sample on a closed case';
  end if;

  loop
    v_barcode := public.gen_barcode();
    exit when not exists (select 1 from public.samples where barcode = v_barcode);
  end loop;

  insert into public.samples
    (case_id, barcode, status, specimen_type, collected_at, disease_code)
  values
    (p_case, v_barcode, 'collected', p_specimen, now(), v_case.disease_code)
  returning * into v_sample;

  update public.cases set updated_at = now() where id = p_case;
  perform public.append_event(p_case, 'sample_created', v_case.status::text, v_case.status::text,
    'Sample created barcode ' || v_barcode || ' (' || p_specimen || ')');
  return v_sample;
end $$;

-- Transition sample pipeline status with a chain-of-custody entry.
create or replace function public.sample_set_status(
  p_sample uuid, p_status text, p_note text default null
)
returns public.samples
language plpgsql security definer set search_path = public
as $$
declare
  v_sample public.samples;
  v_prev   public.cases%rowtype;
  v_case   public.cases%rowtype;
begin
  if public.my_role() not in ('vet','officer','lab','admin') then
    raise exception 'only vets, officers and labs can update samples';
  end if;
  if p_status not in ('collected','in_transit','received','resulted') then
    raise exception 'invalid sample status: %', p_status;
  end if;

  select * into v_sample from public.samples where id = p_sample;
  if not found then raise exception 'sample not found'; end if;
  select * into v_case from public.cases where id = v_sample.case_id;
  if public.my_role() <> 'admin' and v_case.district is distinct from public.my_district() then
    raise exception 'sample is outside your district';
  end if;

  update public.samples
     set status        = p_status::sample_status,
         received_at   = case when p_status = 'received' then now() else received_at end,
         resulted_at   = case when p_status = 'resulted' then now() else resulted_at end,
         notes         = coalesce(p_note, notes)
   where id = p_sample
  returning * into v_sample;

  perform public.append_event(v_sample.case_id, 'sample_status', v_sample.status::text, p_status, p_note);
  update public.cases set updated_at = now() where id = v_sample.case_id;
  return v_sample;
end $$;

-- Enter a lab result (optionally flags the disease as confirmed).
create or replace function public.sample_set_result(
  p_sample uuid, p_result text, p_result_summary text default null, p_confirmed boolean default false
)
returns public.samples
language plpgsql security definer set search_path = public
as $$
declare
  v_sample public.samples;
  v_case   public.cases%rowtype;
begin
  if public.my_role() not in ('vet','officer','lab','admin') then
    raise exception 'only vets, officers and labs can enter a result';
  end if;
  select * into v_sample from public.samples where id = p_sample;
  if not found then raise exception 'sample not found'; end if;
  select * into v_case from public.cases where id = v_sample.case_id;
  if public.my_role() <> 'admin' and v_case.district is distinct from public.my_district() then
    raise exception 'sample is outside your district';
  end if;

  update public.samples
     set result         = p_result,
         result_summary = coalesce(p_result_summary, p_result),
         status         = 'resulted',
         resulted_at    = coalesce(resulted_at, now())
   where id = p_sample
  returning * into v_sample;

  perform public.append_event(v_sample.case_id, 'sample_result', v_sample.status::text, 'resulted',
    'Result: ' || p_result);
  update public.cases set updated_at = now() where id = v_sample.case_id;
  return v_sample;
end $$;

-- ============================================================================
-- Vaccination record + coverage gap
-- ============================================================================
create or replace function public.add_vaccination(
  p_animal uuid, p_vaccine text, p_dose_no int, p_date date, p_administered_by text default null
)
returns public.vaccinations
language plpgsql security definer set search_path = public
as $$
declare v public.vaccinations;
begin
  -- owner of the animal or an official in the same district
  if not exists (
    select 1 from public.animals a
    left join public.profiles p on p.id = a.owner_id
    where a.id = p_animal
      and (a.owner_id = auth.uid()
           or public.my_role() in ('vet','officer','admin')
           or (public.my_role() in ('vet','officer') and p.district = public.my_district()))
  ) then
    raise exception 'cannot record a vaccination for this animal';
  end if;

  insert into public.vaccinations (animal_id, vaccine, dose_no, date, administered_by)
  values (p_animal, p_vaccine, p_dose_no, p_date, p_administered_by)
  returning * into v;
  return v;
end $$;

-- District / taluka coverage summary: per-vaccine dose coverage per district.
create or replace function public.vaccination_coverage(p_district text default null)
returns table(
  district  text,
  vaccine   text,
  animals   bigint,
  vaccinated bigint,
  coverage  numeric
)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  with anim as (
    select a.id animal_id, coalesce(p.district, p.village) district
    from public.animals a
    left join public.profiles p on p.id = a.owner_id
  ),
  counts as (
    select a.district,
           coalesce(x.vaccine, 'FMD') vaccine,
           count(distinct a.animal_id) animals,
           count(distinct x.animal_id) vaccinated
    from anim a
    left join public.vaccinations x on x.animal_id = a.animal_id
    where (p_district is null or a.district = p_district)
    group by a.district, coalesce(x.vaccine, 'FMD')
  )
  select c.district, c.vaccine, c.animals::bigint, c.vaccinated::bigint,
         round((c.vaccinated::numeric / nullif(c.animals,0)) * 100, 1) coverage
  from counts c
  order by c.district, c.vaccine;
end $$;

-- ============================================================================
-- Public sample trace-back (no PII). Security definer so anonymous guests can
-- scan a barcode and see the sample status, lab result, and chain of custody.
-- ============================================================================
create or replace function public.sample_trace(p_barcode text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'found', true,
    'barcode', s.barcode,
    'status', s.status::text,
    'specimen_type', s.specimen_type,
    'disease_code', s.disease_code,
    'result', s.result,
    'result_summary', s.result_summary,
    'collected_at', s.collected_at,
    'received_at', s.received_at,
    'resulted_at', s.resulted_at,
    'created_at', s.created_at,
    'custody_json', s.custody_json,
    'case_id', s.case_id::text,
    'case_status', c.status::text,
    'disease', coalesce(d.name_en, s.disease_code),
    'disease_hi', coalesce(d.name_hi, s.disease_code),
    'disease_mr', coalesce(d.name_mr, s.disease_code)
  ) into v
  from public.samples s
  left join public.cases c on c.id = s.case_id
  left join public.diseases d on d.code = s.disease_code
  where s.barcode = p_barcode;
  if found then
    return v;
  end if;
  return jsonb_build_object('found', false, 'barcode', p_barcode);
end $$;
grant execute on function public.sample_trace(text) to anon, authenticated;

-- ============================================================================
-- RLS
-- ============================================================================
drop policy if exists "cases officials" on public.cases;
create policy "cases officials" on public.cases
  for all using (
    public.my_role() = 'admin'
    or (public.my_role() in ('vet','officer','lab') and district = public.my_district())
  ) with check (
    public.my_role() = 'admin'
    or (public.my_role() in ('vet','officer','lab') and district = public.my_district())
  );

drop policy if exists "samples officials" on public.samples;
create policy "samples officials" on public.samples
  for all using (
    public.my_role() = 'admin'
    or exists (select 1 from public.cases c where c.id = case_id
               and public.my_role() in ('vet','officer','lab')
               and c.district = public.my_district())
  ) with check (
    public.my_role() = 'admin'
    or exists (select 1 from public.cases c where c.id = case_id
               and public.my_role() in ('vet','officer','lab')
               and c.district = public.my_district())
  );

drop policy if exists "case_events officials" on public.case_events;
create policy "case_events officials" on public.case_events
  for select using (
    public.my_role() = 'admin'
    or exists (select 1 from public.cases c where c.id = case_id
               and public.my_role() in ('vet','officer','lab','admin')
               and (public.my_role() = 'admin' or c.district = public.my_district()))
  );

-- farmer can see their own close-the-loop alerts plus any district broadcast
drop policy if exists "alerts read" on public.alerts;
create policy "alerts read" on public.alerts
  for select to authenticated using (
    public.my_role() = 'admin'
    or user_id = auth.uid()
    or (public.my_district() is not null and district = public.my_district())
  );

drop policy if exists "alerts update" on public.alerts;
create policy "alerts update" on public.alerts
  for update to authenticated
  using (public.my_role() = 'admin' or user_id = auth.uid() or district = public.my_district())
  with check (public.my_role() = 'admin' or user_id = auth.uid() or district = public.my_district());

-- ============================================================================
-- Realtime: keep the officer queue + lab pipeline live.
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.cases;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.samples;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.case_events;
exception when duplicate_object then null;
end $$;
