-- P10 judge-demo timeline. Idempotent; uses the test farmer and realistic AIKTC Panvel locations.
-- This is synthetic pilot data, never presented as live government surveillance.
do $$
declare farmer uuid; i int; rid uuid; ts timestamptz; lat double precision; lng double precision;
begin
 select p.id into farmer from profiles p join auth.users u on u.id=p.id where u.email='test.farmer@pashusetu.dev';
 if farmer is null then raise exception 'test farmer account missing'; end if;
 for i in 1..5 loop
  rid:=('a8100000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
  ts:=timestamptz '2026-09-04 04:30:00+00'+make_interval(mins=>i*24);
  lat:=19.0000386+(i-3)*.002; lng:=73.1045685+(i-3)*.0025;
  insert into reports(id,reporter_id,species,symptoms,free_text,sick_count,dead_count,geo,village,taluka,district,status,offline_ts,created_at,source)
  values(rid,farmer,'cattle','["fever","mouth_blisters","drooling","lameness","milk_drop"]',
   'Synthetic SIH demo timeline: farmer-observed FMD-like signs.',2+mod(i,3),case when i=5 then 1 else 0 end,
   st_setsrid(st_makepoint(lng,lat),4326)::geography,'Khandagaon (AIKTC)','Panvel','Raigad','triaged',ts,ts,'app')
  on conflict(id) do update set symptoms=excluded.symptoms,sick_count=excluded.sick_count,dead_count=excluded.dead_count,geo=excluded.geo,status='triaged';
  insert into triage_results(report_id,disease_candidates,confidence,urgency,advisory_text,advisory_lang,notifiable_flag,source,created_at)
  values(rid,jsonb_build_array(jsonb_build_object('code','FMD','confidence',.86,'matched',jsonb_build_array('fever','mouth_blisters','drooling','lameness'),'missed','[]'::jsonb,'reasons',jsonb_build_array(jsonb_build_object('key','hallmark','symptom','mouth_blisters')))),.86,
   case when i=5 then 'critical' else 'high' end,'Synthetic demo triage. Isolate affected animals and contact a veterinarian. Preliminary triage, not a diagnosis — consult a vet.','en',true,'rule_engine',ts)
  on conflict(report_id,source) do update set disease_candidates=excluded.disease_candidates,confidence=excluded.confidence,urgency=excluded.urgency;
 end loop;
 perform detect_clusters(p_district=>'Raigad');
 perform run_early_warning('2026-09-04','Raigad');
end $$;
