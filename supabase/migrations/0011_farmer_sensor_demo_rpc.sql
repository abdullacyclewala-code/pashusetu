-- Farmer-owned demo RPCs. They use the signed-in session, so the web demo does not
-- depend on a server service-role environment variable and cannot reset another herd.
create or replace function public.reset_my_iot_demo()
returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); ids uuid[]; cids text[];
begin
 if uid is null or public.my_role()<>'farmer' then raise exception 'farmer_only'; end if;
 select array_agg(r.id) into ids from reports r where r.reporter_id=uid and r.iot_event_key is not null;
 select array_agg(c.id::text) into cids from clusters c where c.member_ids && coalesce(ids,'{}'::uuid[]);
 delete from alerts where message_json->>'cluster_id'=any(coalesce(cids,'{}'::text[]));
 delete from clusters where id::text=any(coalesce(cids,'{}'::text[]));
 -- Release anomaly.report_id references before removing the private reports.
 delete from iot_anomalies a using devices d where a.device_id=d.id and d.owner_id=uid;
 delete from telemetry t using devices d where t.device_id=d.id and d.owner_id=uid;
 delete from reports where id=any(coalesce(ids,'{}'::uuid[]));
 update devices set last_seen=null where owner_id=uid;
end $$;
revoke all on function public.reset_my_iot_demo() from public,anon; grant execute on function public.reset_my_iot_demo() to authenticated;

create or replace function public.run_my_iot_demo()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); d devices%rowtype; day int; tid uuid; result jsonb; total int:=0; temp numeric; rum numeric; act numeric; milk numeric; env numeric; base_ts timestamptz;
begin
 if uid is null or public.my_role()<>'farmer' then raise exception 'farmer_only'; end if;
 if (select count(*) from devices where owner_id=uid and external_id like 'PS-COLLAR-00%')<3 then raise exception 'demo_sensors_not_linked'; end if;
 perform public.reset_my_iot_demo();
 for day in 0..6 loop
  for d in select * from devices where owner_id=uid and external_id like 'PS-COLLAR-00%' order by external_id loop
   temp:=38.45+(right(d.external_id,1)::int-1)*.06; rum:=450-(right(d.external_id,1)::int-1)*8; act:=100-(right(d.external_id,1)::int-1)*2; milk:=10.7-(right(d.external_id,1)::int-1)*.2; env:=30;
   if day=3 then temp:=39; env:=42; end if;
   if day=4 then temp:=40.4+(right(d.external_id,1)::int-1)*.15; rum:=250-(right(d.external_id,1)::int-1)*5; act:=46; milk:=7.1; env:=31; end if;
   if day>=5 then temp:=41+(right(d.external_id,1)::int-1)*.12; rum:=175-(right(d.external_id,1)::int-1)*4; act:=32; milk:=5.8; env:=30; end if;
   base_ts:=make_timestamptz(2026,9,10+day,6+right(d.external_id,1)::int,0,0,'UTC');
   insert into telemetry(device_id,ts,body_temp_c,rumination_min,activity,milk_yield_kg,env_temp_c,humidity_pct,battery_pct,ingest_id,raw)
   values(d.id,base_ts,temp,rum,act,milk,env,case when day=3 then 75 else 68 end,90-day,gen_random_uuid(),jsonb_build_object('source','farmer_demo')) returning id into tid;
   update devices set last_seen=base_ts where id=d.id;
   result:=public.process_iot_telemetry(tid); total:=total+1;
  end loop;
 end loop;
 return jsonb_build_object('ok',true,'points',total,'last_detection',result);
end $$;
revoke all on function public.run_my_iot_demo() from public,anon; grant execute on function public.run_my_iot_demo() to authenticated;
