-- Relocate only synthetic/demo records from Pune to the AIKTC Panvel test site.
-- Real farmer accounts and non-demo Pune records are intentionally untouched.
do $$
declare farmer uuid; officer uuid; demo_ids uuid[]; cluster_ids text[];
begin
 select p.id into farmer from profiles p join auth.users u on u.id=p.id where u.email='test.farmer@pashusetu.dev';
 select p.id into officer from profiles p join auth.users u on u.id=p.id where u.email='officer.pune@pashusetu.dev';
 if farmer is null or officer is null then raise exception 'demo accounts missing'; end if;

 -- Remove only records owned by the test farmer or carrying known demo UUID/provenance.
 select array_agg(id) into demo_ids from reports where reporter_id=farmer
   or id::text like '22222222-2222-4222-8222-%'
   or id::text like 'a8100000-0000-4000-8000-%'
   or free_text ilike '%synthetic%sih%demo%';
 select array_agg(id::text) into cluster_ids from clusters where member_ids && coalesce(demo_ids,'{}'::uuid[]);
 delete from alerts where message_json->>'cluster_id'=any(coalesce(cluster_ids,'{}'::text[]));
 delete from clusters where id::text=any(coalesce(cluster_ids,'{}'::text[]));
 delete from samples where case_id in(select id from cases where report_id=any(coalesce(demo_ids,'{}'::uuid[])));
 delete from case_events where case_id in(select id from cases where report_id=any(coalesce(demo_ids,'{}'::uuid[])));
 delete from cases where report_id=any(coalesce(demo_ids,'{}'::uuid[]));
 delete from iot_anomalies where report_id=any(coalesce(demo_ids,'{}'::uuid[]));
 delete from reports where id=any(coalesce(demo_ids,'{}'::uuid[]));
 -- Release dairy_anomalies.alert_id before deleting its synthetic alert.
 delete from dairy_anomalies where dairy_id in('DAIRY-SHIRUR-01','DAIRY-AIKTC-01');
 delete from alerts where user_id=farmer or message_json->>'type'='dairy_anomaly';

 -- Campus location: Plot 2/3, Sector 16, Khanda Gaon, New Panvel 410206.
 insert into villages(name,taluka,district,geo) values
 ('Khandagaon (AIKTC)','Panvel','Raigad',st_setsrid(st_makepoint(73.1045685,19.0000386),4326)::geography)
 on conflict do nothing;
 update profiles set village='Khandagaon (AIKTC)',taluka='Panvel',district='Raigad' where id=farmer;
 update profiles set village='Panvel',taluka='Panvel',district='Raigad' where id=officer;

 -- Move synthetic dairy history while preserving its planted control/anomaly values.
 delete from dairy_anomalies where dairy_id in('DAIRY-SHIRUR-01','DAIRY-AIKTC-01');
 delete from district_risk_forecasts where district in('Pune','Raigad');
 update milk_collections set dairy_id='DAIRY-AIKTC-01',village='Khandagaon (AIKTC)',block='Panvel',district='Raigad' where dairy_id='DAIRY-SHIRUR-01';
 update weather_daily set village='Khandagaon (AIKTC)',district='Raigad' where village='Shirur' and district='Pune';

 -- Move the test farmer's three demo collars; clear their old Pune run.
 delete from iot_anomalies where device_id in(select id from devices where owner_id=farmer);
 delete from telemetry where device_id in(select id from devices where owner_id=farmer);
 update devices set village='Khandagaon (AIKTC)',block='Panvel',district='Raigad',lat=19.0000386,lng=73.1045685,last_seen=null where owner_id=farmer;
 perform run_early_warning('2026-09-04','Raigad');
end $$;
