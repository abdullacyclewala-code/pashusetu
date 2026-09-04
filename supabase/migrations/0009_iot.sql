-- P9 IoT: production-shaped device registry, idempotent telemetry and automatic reports.
create table public.devices (
 id uuid primary key default gen_random_uuid(), external_id text not null unique,
 type text not null check(type in('ear_tag','rumen_bolus','neck_collar','shed_env','milk_line')),
 animal_id uuid references public.animals(id) on delete set null,
 owner_id uuid references public.profiles(id) on delete set null,
 village text not null, block text, district text not null,
 lat double precision, lng double precision, protocol text not null default 'http' check(protocol in('http','mqtt')),
 status text not null default 'active' check(status in('active','offline','maintenance')),
 api_key_hash text not null, last_seen timestamptz, created_at timestamptz not null default now()
);
create table public.telemetry (
 id uuid primary key default gen_random_uuid(), device_id uuid not null references public.devices(id) on delete cascade,
 ts timestamptz not null, body_temp_c numeric, rumination_min numeric, activity numeric,
 milk_yield_kg numeric, env_temp_c numeric, humidity_pct numeric, ammonia_ppm numeric, battery_pct numeric,
 ingest_id uuid not null, ingested_at timestamptz not null default now(), raw jsonb not null default '{}'::jsonb,
 unique(device_id,ts), unique(device_id,ingest_id)
);
create index telemetry_device_ts on public.telemetry(device_id,ts desc);
create table public.iot_anomalies (
 id uuid primary key default gen_random_uuid(), device_id uuid not null references public.devices(id) on delete cascade,
 ts timestamptz not null, scenario_day date not null, baseline jsonb not null, deviations jsonb not null,
 anomaly_type text not null, severity text not null, concurrent_devices int not null default 1,
 report_id uuid references public.reports(id), created_at timestamptz not null default now(), unique(device_id,scenario_day,anomaly_type)
);
alter table public.reports add column if not exists iot_event_key text unique;

alter table public.devices enable row level security; alter table public.telemetry enable row level security; alter table public.iot_anomalies enable row level security;
create policy "devices district read" on public.devices for select to authenticated using(public.my_role()='admin' or district=public.my_district() or owner_id=auth.uid());
create policy "telemetry district read" on public.telemetry for select to authenticated using(exists(select 1 from devices d where d.id=device_id and (public.my_role()='admin' or d.district=public.my_district() or d.owner_id=auth.uid())));
create policy "iot anomalies district read" on public.iot_anomalies for select to authenticated using(exists(select 1 from devices d where d.id=device_id and (public.my_role()='admin' or d.district=public.my_district() or d.owner_id=auth.uid())));

-- Called after each accepted point. A healthy per-device baseline is computed only from
-- older points; shed heat is a control covariate. Reports require two concurrent animals.
create or replace function public.process_iot_telemetry(p_telemetry uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare x telemetry%rowtype; d devices%rowtype; b_temp numeric; b_rum numeric; b_act numeric; b_milk numeric;
 fever boolean; rum_drop boolean; act_drop boolean; milk_drop boolean; heat_control boolean; n int; rid uuid; aid uuid; event text;
begin
 select * into x from telemetry where id=p_telemetry; if not found then raise exception 'telemetry_not_found'; end if;
 select * into d from devices where id=x.device_id;
 select percentile_cont(.5) within group(order by body_temp_c), percentile_cont(.5) within group(order by rumination_min),
   percentile_cont(.5) within group(order by activity), percentile_cont(.5) within group(order by milk_yield_kg)
 into b_temp,b_rum,b_act,b_milk from (select * from telemetry where device_id=x.device_id and ts<x.ts order by ts desc limit 30) h;
 if b_temp is null or b_rum is null then return jsonb_build_object('status','learning_baseline'); end if;
 fever:=x.body_temp_c>b_temp+1.2; rum_drop:=x.rumination_min<b_rum*.65; act_drop:=x.activity<b_act*.55;
 milk_drop:=x.milk_yield_kg is not null and b_milk is not null and x.milk_yield_kg<b_milk*.72;
 heat_control:=coalesce(x.env_temp_c,0)>=40 and not rum_drop and not act_drop;
 if heat_control or not(fever and rum_drop and (act_drop or milk_drop)) then return jsonb_build_object('status','normal','heat_control',heat_control); end if;
 insert into iot_anomalies(device_id,ts,scenario_day,baseline,deviations,anomaly_type,severity)
 values(d.id,x.ts,(x.ts at time zone 'Asia/Kolkata')::date,jsonb_build_object('body_temp_c',b_temp,'rumination_min',b_rum,'activity',b_act,'milk_yield_kg',b_milk),
 jsonb_build_object('body_temp_c',x.body_temp_c-b_temp,'rumination_pct',round(100*(x.rumination_min/b_rum-1),1),'activity_pct',round(100*(x.activity/b_act-1),1),'milk_pct',case when b_milk>0 then round(100*(x.milk_yield_kg/b_milk-1),1) else null end,'activity_drop',act_drop,'milk_drop',milk_drop),
 'fever_rumination_drop','high') on conflict(device_id,scenario_day,anomaly_type) do update set ts=excluded.ts,deviations=excluded.deviations returning id into aid;
 select count(distinct a.device_id) into n from iot_anomalies a join devices q on q.id=a.device_id where q.village=d.village and q.district=d.district and a.scenario_day=(x.ts at time zone 'Asia/Kolkata')::date and a.anomaly_type='fever_rumination_drop';
 update iot_anomalies set concurrent_devices=n where id=aid;
 if n>=2 then
  event:=d.district||'|'||d.village||'|'||(x.ts at time zone 'Asia/Kolkata')::date||'|fever_rumination_drop';
  select id into rid from reports where iot_event_key=event;
  if rid is null then
   insert into reports(reporter_id,animal_id,species,symptoms,free_text,sick_count,dead_count,geo,village,taluka,district,status,offline_ts,source,iot_event_key)
   values(coalesce(d.owner_id,(select id from profiles where district=d.district and role in('officer','admin') order by role limit 1)),d.animal_id,'cattle','["fever","reduced_appetite","milk_drop","weakness"]'::jsonb,
   'Automatically created by herd-concurrency sensor detection. Preliminary signal; veterinary verification required.',n,0,case when d.lat is not null then st_setsrid(st_makepoint(d.lng,d.lat),4326)::geography end,d.village,d.block,d.district,'pending',x.ts,'iot',event) returning id into rid;
  end if;
  update iot_anomalies a set report_id=rid,concurrent_devices=n from devices q where q.id=a.device_id and q.village=d.village and a.scenario_day=(x.ts at time zone 'Asia/Kolkata')::date;
 end if;
 return jsonb_build_object('status','anomaly','concurrent_devices',n,'report_id',rid);
end $$;
revoke all on function public.process_iot_telemetry(uuid) from public,anon,authenticated; grant execute on function public.process_iot_telemetry(uuid) to service_role;

do $$ begin alter publication supabase_realtime add table public.telemetry; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.iot_anomalies; exception when duplicate_object then null; end $$;
-- Demo-only deterministic reset. Restricted to service_role; production device data is untouched.
create or replace function public.reset_iot_demo() returns void language plpgsql security definer set search_path=public as $$
declare ids uuid[]; cids text[]; begin
 select array_agg(id) into ids from reports where iot_event_key like 'Pune|Shirur|2026-09-%';
 select array_agg(id::text) into cids from clusters where member_ids && coalesce(ids,'{}'::uuid[]);
 delete from alerts where message_json->>'cluster_id'=any(coalesce(cids,'{}'::text[]));
 delete from clusters where id::text=any(coalesce(cids,'{}'::text[]));
 delete from reports where id=any(coalesce(ids,'{}'::uuid[]));
 delete from telemetry where device_id in(select id from devices where external_id like 'PS-COLLAR-00%');
 update devices set last_seen=null where external_id like 'PS-COLLAR-00%';
end $$;
revoke all on function public.reset_iot_demo() from public,anon,authenticated; grant execute on function public.reset_iot_demo() to service_role;
