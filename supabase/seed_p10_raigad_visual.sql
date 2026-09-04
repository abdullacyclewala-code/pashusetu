-- Presentation seed: three additional Raigad clusters and all four urgency colours.
-- Synthetic data only. Idempotent fixed UUIDs.
do $$
declare farmer uuid; g record; i int; rid uuid; code text; urgency text; symptoms jsonb; base_lat float8; base_lng float8; village text;
begin
 select p.id into farmer from profiles p join auth.users u on u.id=p.id where u.email='test.farmer@pashusetu.dev';
 if farmer is null then raise exception 'test farmer missing'; end if;
 for g in select * from (values
   (1,'MAST','low','Kalamboli',19.0330::float8,73.1010::float8,'["udder_swelling","abnormal_milk","udder_pain"]'::jsonb),
   (2,'BRUC','medium','New Panvel',18.9894::float8,73.1175::float8,'["abortion","retained_placenta","infertility"]'::jsonb),
   (3,'LSD','high','Uran',18.8772::float8,72.9283::float8,'["fever","skin_nodules","swollen_lymph_nodes","milk_drop"]'::jsonb)
 ) x(grp,code,urgency,village,lat,lng,symptoms)
 loop
  code:=g.code; urgency:=g.urgency; symptoms:=g.symptoms; base_lat:=g.lat; base_lng:=g.lng; village:=g.village;
  for i in 1..3 loop
   rid:=('a82'||g.grp::text||'0000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
   insert into reports(id,reporter_id,species,symptoms,free_text,sick_count,dead_count,geo,village,taluka,district,status,offline_ts,created_at,source)
   values(rid,farmer,'cattle',symptoms,'Synthetic Raigad presentation case — not a live disease report.',i,0,
    st_setsrid(st_makepoint(base_lng+(i-2)*.003,base_lat+(i-2)*.002),4326)::geography,village,case when village='Uran' then 'Uran' else 'Panvel' end,'Raigad','triaged',
    timestamptz '2026-09-04 08:00:00+00'+make_interval(mins=>g.grp*70+i*13),timestamptz '2026-09-04 08:00:00+00'+make_interval(mins=>g.grp*70+i*13),'app')
   on conflict(id) do update set geo=excluded.geo,village=excluded.village,taluka=excluded.taluka,district='Raigad',symptoms=excluded.symptoms,status='triaged';
   insert into triage_results(report_id,disease_candidates,confidence,urgency,advisory_text,advisory_lang,notifiable_flag,source,created_at)
   values(rid,jsonb_build_array(jsonb_build_object('code',code,'confidence',case urgency when 'low' then .38 when 'medium' then .57 else .78 end,'matched',symptoms,'missed','[]'::jsonb,'reasons',jsonb_build_array(jsonb_build_object('key','symptom_match')))),
    case urgency when 'low' then .38 when 'medium' then .57 else .78 end,urgency,
    'Synthetic demonstration result. Preliminary triage, not a diagnosis — consult a veterinarian.','en',code in('LSD','BRUC'),'rule_engine',now())
   on conflict(report_id,source) do update set disease_candidates=excluded.disease_candidates,confidence=excluded.confidence,urgency=excluded.urgency;
  end loop;
 end loop;
 perform detect_clusters(p_district=>'Raigad');
end $$;
