-- PashuSetu P8: covariate-adjusted dairy anomaly + report EWMA forecasts.
-- Raw aggregate data is retained separately from model runs for auditability.
create table if not exists public.milk_collections (
  id uuid primary key default gen_random_uuid(), dairy_id text not null,
  village text not null, block text not null, district text not null,
  date date not null, species text not null default 'cattle',
  avg_yield_kg numeric(8,3) not null check (avg_yield_kg >= 0),
  animals_count int not null check (animals_count > 0),
  created_at timestamptz not null default now(),
  unique(dairy_id, date, species)
);
alter table public.milk_collections add column if not exists district text;
alter table public.milk_collections add column if not exists created_at timestamptz not null default now();
update public.milk_collections m set district=v.district from public.villages v where m.district is null and lower(v.name)=lower(m.village);
update public.milk_collections set district='Unknown' where district is null;
alter table public.milk_collections alter column district set not null;
create unique index if not exists milk_dairy_date_species_unique on public.milk_collections(dairy_id,date,species);

create index if not exists milk_collection_place_date on public.milk_collections(district, village, date desc);

create table if not exists public.weather_daily (
  village text not null, district text not null, date date not null,
  temperature_max_c numeric, humidity_mean_pct numeric, rainfall_mm numeric,
  source text not null default 'open-meteo', fetched_at timestamptz not null default now(),
  primary key(village, district, date)
);

create table if not exists public.dairy_anomalies (
  id uuid primary key default gen_random_uuid(), dairy_id text not null,
  village text not null, block text not null, district text not null, date date not null,
  observed_yield numeric not null, seasonal_baseline numeric not null,
  weather_adjustment numeric not null default 0, residual numeric not null,
  residual_z numeric not null, consecutive_days int not null default 0,
  status text not null check(status in ('normal','watch','field_verify')),
  reason jsonb not null default '{}'::jsonb, alert_id uuid references public.alerts(id),
  model_version text not null default 'robust-covariate-v1', created_at timestamptz not null default now(),
  unique(dairy_id,date)
);

create table if not exists public.district_risk_forecasts (
  id uuid primary key default gen_random_uuid(), district text not null, block text not null,
  forecast_date date not null, observed_reports int not null, baseline numeric not null,
  ewma numeric not null, report_z numeric not null, weather_risk numeric not null default 0,
  dairy_risk numeric not null default 0, risk_score numeric not null,
  risk_level text not null check(risk_level in ('low','medium','high')),
  reasons jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(),
  unique(district, block, forecast_date)
);

alter table public.milk_collections enable row level security;
alter table public.weather_daily enable row level security;
alter table public.dairy_anomalies enable row level security;
alter table public.district_risk_forecasts enable row level security;
create policy "milk officials read" on public.milk_collections for select to authenticated using (public.my_role()='admin' or district=public.my_district());
create policy "weather district read" on public.weather_daily for select to authenticated using (public.my_role()='admin' or district=public.my_district());
create policy "anomalies district read" on public.dairy_anomalies for select to authenticated using (public.my_role()='admin' or district=public.my_district());
create policy "forecasts district read" on public.district_risk_forecasts for select to authenticated using (public.my_role()='admin' or district=public.my_district());

-- Median helper: robust to planted outbreaks; the detector never trains on the day it scores.
create or replace function public.run_early_warning(p_as_of date default current_date, p_district text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; v_base numeric; v_sigma numeric; v_expected numeric; v_res numeric; v_z numeric;
  v_prev numeric; v_consecutive int; v_status text; v_alert uuid; v_count int:=0; f record;
begin
  -- Seasonal baseline: same weekday over trailing 12 weeks. Weather coefficients are
  -- conservative domain priors (heat/humidity/rain) and only explain adverse weather dips.
  for r in select m.*, w.temperature_max_c, w.humidity_mean_pct, w.rainfall_mm
    from milk_collections m left join weather_daily w using(village,district,date)
    where m.date between p_as_of-1 and p_as_of and (p_district is null or m.district=p_district) order by m.dairy_id,m.date
  loop
    select percentile_cont(.5) within group(order by avg_yield_kg),
           greatest(0.12, 1.4826*percentile_cont(.5) within group(order by abs(avg_yield_kg-x.med)))
      into v_base,v_sigma
      from milk_collections h
      cross join lateral (select percentile_cont(.5) within group(order by avg_yield_kg) med
        from milk_collections where dairy_id=r.dairy_id and date between r.date-84 and r.date-7) x
     where h.dairy_id=r.dairy_id and h.date between r.date-84 and r.date-7
       and extract(isodow from h.date)=extract(isodow from r.date);
    if v_base is null then continue; end if;
    -- Expected yield reduction from severe heat/humidity/rain; prevents weather false alarms.
    v_expected := greatest(-1.8, -0.09*greatest(coalesce(r.temperature_max_c,30)-34,0)
      -0.012*greatest(coalesce(r.humidity_mean_pct,60)-80,0)-0.018*greatest(coalesce(r.rainfall_mm,0)-25,0));
    v_res:=r.avg_yield_kg-v_base-v_expected; v_z:=v_res/v_sigma;
    select residual_z into v_prev from dairy_anomalies where dairy_id=r.dairy_id and date=r.date-1;
    v_consecutive:=case when v_z < -2.5 then (case when coalesce(v_prev,0)<-2.5 then 2 else 1 end) else 0 end;
    v_status:=case when v_consecutive>=2 then 'field_verify' when v_z < -2.5 then 'watch' else 'normal' end;
    insert into dairy_anomalies(dairy_id,village,block,district,date,observed_yield,seasonal_baseline,weather_adjustment,residual,residual_z,consecutive_days,status,reason)
    values(r.dairy_id,r.village,r.block,r.district,r.date,r.avg_yield_kg,v_base,v_expected,v_res,v_z,v_consecutive,v_status,
      jsonb_build_object('method','weekday median + MAD; weather adjusted','temperature_max_c',r.temperature_max_c,'humidity_mean_pct',r.humidity_mean_pct,'rainfall_mm',r.rainfall_mm))
    on conflict(dairy_id,date) do update set observed_yield=excluded.observed_yield,seasonal_baseline=excluded.seasonal_baseline,weather_adjustment=excluded.weather_adjustment,residual=excluded.residual,residual_z=excluded.residual_z,consecutive_days=excluded.consecutive_days,status=excluded.status,reason=excluded.reason;
    if v_status='field_verify' then
      select alert_id into v_alert from dairy_anomalies where dairy_id=r.dairy_id and date=r.date;
      if v_alert is null then
        insert into alerts(severity,audience,district,channel,message_json) values('warning','all',r.district,'in_app',jsonb_build_object(
          'type','dairy_anomaly','village',r.village,'block',r.block,'z_score',round(v_z,1),'observed',r.avg_yield_kg,'baseline',round(v_base+v_expected,1),
          'en','Unexplained milk-yield dip in '||r.village||' for 2 consecutive days. Weather effects were removed. Field verification advised.',
          'hi',r.village||' में लगातार 2 दिन दूध उत्पादन में अस्पष्ट गिरावट। मौसम का प्रभाव हटाया गया है। फील्ड सत्यापन करें।',
          'mr',r.village||' येथे सलग 2 दिवस दूध उत्पादनात अस्पष्ट घट. हवामानाचा प्रभाव वजा केला आहे. क्षेत्र पडताळणी करा.')) returning id into v_alert;
        update dairy_anomalies set alert_id=v_alert where dairy_id=r.dairy_id and date=r.date;
      end if; v_count:=v_count+1;
    end if;
  end loop;

  -- Block report-count EWMA. A spike is combined with dairy/weather evidence, not treated as diagnosis.
  for f in select coalesce(district,'Unknown') district, coalesce(taluka,'Unknown') block,
      count(*) filter(where created_at::date=p_as_of)::int today,
      count(*) filter(where created_at::date between p_as_of-28 and p_as_of-1)::numeric/28 baseline
    from reports where (p_district is null or district=p_district) group by district,taluka
  loop
    v_sigma:=greatest(1,sqrt(greatest(f.baseline,0.1))); v_z:=(f.today-f.baseline)/v_sigma;
    insert into district_risk_forecasts(district,block,forecast_date,observed_reports,baseline,ewma,report_z,weather_risk,dairy_risk,risk_score,risk_level,reasons)
    values(f.district,f.block,p_as_of+1,f.today,f.baseline,.4*f.today+.6*f.baseline,v_z,0,
      case when exists(select 1 from dairy_anomalies d where d.district=f.district and d.block=f.block and d.date between p_as_of-1 and p_as_of and d.status='field_verify') then 1 else 0 end,
      least(100,greatest(0,20+18*v_z)+case when exists(select 1 from dairy_anomalies d where d.district=f.district and d.block=f.block and d.date between p_as_of-1 and p_as_of and d.status='field_verify') then 25 else 0 end),
      case when v_z>=2.5 then 'high' when v_z>=1.25 then 'medium' else 'low' end,
      jsonb_build_array(jsonb_build_object('key','report_spike','value',round(v_z,1))))
    on conflict(district,block,forecast_date) do update set observed_reports=excluded.observed_reports,baseline=excluded.baseline,ewma=excluded.ewma,report_z=excluded.report_z,dairy_risk=excluded.dairy_risk,risk_score=excluded.risk_score,risk_level=excluded.risk_level,reasons=excluded.reasons,created_at=now();
  end loop;
  return jsonb_build_object('as_of',p_as_of,'field_verify',v_count);
end $$;
revoke all on function public.run_early_warning(date,text) from public,anon,authenticated;
grant execute on function public.run_early_warning(date,text) to service_role;

do $$ begin alter publication supabase_realtime add table public.dairy_anomalies; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.district_risk_forecasts; exception when duplicate_object then null; end $$;
do $$ begin create extension if not exists pg_cron; perform cron.unschedule('early-warning-nightly'); exception when others then null; end $$;
do $$ begin perform cron.schedule('early-warning-nightly','35 0 * * *',$q$select public.run_early_warning(current_date)$q$); exception when others then null; end $$;
create or replace function public.lat(v public.villages) returns double precision language sql stable as $$select st_y(v.geo::geometry)$$;
create or replace function public.lng(v public.villages) returns double precision language sql stable as $$select st_x(v.geo::geometry)$$;
