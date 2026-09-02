-- P3 · Officer dashboard: case decisions, map support, realtime.

-- 'rejected' joins the case lifecycle (kept separate from 'closed' so a
-- rejection is an explicit label, not an ambiguous end-state).
alter type case_status add value if not exists 'rejected';

-- ── decision metadata ──────────────────────────────────────────────────
-- LABELING FLYWHEEL (novelty #4): every officer confirm/reject stores the
-- engine's top disease guess alongside the human verdict. Each decision is
-- therefore a labeled training example (features = report symptoms/context,
-- prediction = disease_code, label = status) that future model versions can
-- learn from — the dashboard quietly builds our training set.
alter table public.cases
  add column if not exists disease_code text,
  add column if not exists decided_by uuid references public.profiles(id),
  add column if not exists decided_at timestamptz;

-- one case per report at this stage; makes decisions idempotent upserts
create unique index if not exists cases_report_id_key on public.cases (report_id);

-- ── map support ────────────────────────────────────────────────────────
-- PostgREST computed columns: lets clients select "lat, lng" on reports
-- without shipping raw PostGIS WKB to the browser.
create or replace function public.lat(r public.reports)
returns double precision language sql stable as
$$ select st_y(r.geo::geometry) $$;

create or replace function public.lng(r public.reports)
returns double precision language sql stable as
$$ select st_x(r.geo::geometry) $$;

-- ── officer decision (atomic, jurisdiction-checked) ────────────────────
-- SECURITY DEFINER because officials may not UPDATE reports directly under
-- RLS; all authorization is re-checked inside.
create or replace function public.officer_decide(p_report_id uuid, p_decision text)
returns public.cases
language plpgsql security definer set search_path = public
as $$
declare
  v_report  public.reports%rowtype;
  v_case    public.cases;
  v_disease text;
begin
  if public.my_role() not in ('vet','officer','admin') then
    raise exception 'only vets and officers can decide cases';
  end if;
  if p_decision not in ('confirmed','rejected') then
    raise exception 'decision must be confirmed or rejected';
  end if;

  select * into v_report from public.reports where id = p_report_id;
  if not found then
    raise exception 'report not found';
  end if;
  if public.my_role() <> 'admin'
     and v_report.district is distinct from public.my_district() then
    raise exception 'report is outside your district';
  end if;

  -- engine's top candidate at decision time = the prediction being labeled
  select tr.disease_candidates->0->>'code' into v_disease
  from public.triage_results tr
  where tr.report_id = p_report_id
  order by tr.created_at desc
  limit 1;

  insert into public.cases
    (report_id, status, district, disease_code, decided_by, decided_at)
  values
    (p_report_id, p_decision::case_status, v_report.district, v_disease, auth.uid(), now())
  on conflict (report_id) do update
    set status       = excluded.status,
        disease_code = excluded.disease_code,
        decided_by   = excluded.decided_by,
        decided_at   = excluded.decided_at,
        updated_at   = now()
  returning * into v_case;

  update public.reports
  set status = case when p_decision = 'confirmed'
                    then 'escalated'::report_status
                    else 'closed'::report_status end
  where id = p_report_id;

  return v_case;
end $$;

revoke execute on function public.officer_decide(uuid, text) from anon;

-- ── realtime ───────────────────────────────────────────────────────────
-- new reports stream to the officer queue live (RLS still applies)
do $$ begin
  alter publication supabase_realtime add table public.reports;
exception when duplicate_object then null;
end $$;
