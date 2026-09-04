-- Complete Raigad P6 demonstration: FMD report → confirmed case → assigned vet
-- → resulted lab sample → contained → farmer notified. Synthetic and idempotent.
do $$
declare farmer uuid; officer uuid; disease int; animal uuid; begin
 select p.id into farmer from profiles p join auth.users u on u.id=p.id where u.email='test.farmer@pashusetu.dev';
 select p.id into officer from profiles p join auth.users u on u.id=p.id where u.email='officer.raigad@pashusetu.dev';
 select id into disease from diseases where code='FMD';
 select id into animal from animals where owner_id=farmer and species='cattle' order by created_at limit 1;
 if farmer is null or officer is null then raise exception 'Raigad demo accounts missing'; end if;

 insert into vets(id,profile_id,name,phone,location,district,taluka)
 values('7c7c7c7c-0000-4000-8000-000000000009',null,'Dr. Sana Shaikh','9876500009',st_setsrid(st_makepoint(73.109,19.004),4326)::geography,'Raigad','Panvel')
 on conflict(id) do update set district='Raigad',taluka='Panvel',name=excluded.name,phone=excluded.phone,location=excluded.location;

 insert into cases(id,report_id,disease_id,status,assigned_vet_id,severity,district,created_at,updated_at,disease_code,decided_by,decided_at,escalated_at,contained_at,notes)
 values('ca260000-0000-4000-8000-000000000009','a8100000-0000-4000-8000-000000000005',disease,'contained','7c7c7c7c-0000-4000-8000-000000000009','critical','Raigad',
 timestamptz '2026-09-04 06:45:00+00',timestamptz '2026-09-04 13:20:00+00','FMD',officer,timestamptz '2026-09-04 07:00:00+00',timestamptz '2026-09-04 07:00:00+00',timestamptz '2026-09-04 13:20:00+00','Movement restricted; affected animals isolated. Ring vaccination initiated around Khandagaon.')
 on conflict(report_id) do update set disease_id=excluded.disease_id,status='contained',assigned_vet_id=excluded.assigned_vet_id,severity='critical',district='Raigad',disease_code='FMD',decided_by=officer,decided_at=excluded.decided_at,escalated_at=excluded.escalated_at,contained_at=excluded.contained_at,notes=excluded.notes,updated_at=excluded.updated_at;

 -- Resolve the actual case id if an officer had already created one for this report.
 insert into samples(id,case_id,barcode,lab_id,result,custody_json,status,created_at,collected_at,received_at,resulted_at,specimen_type,disease_code,notes,result_summary)
 select 'a1a1a1a1-0000-4000-8000-000000000009',c.id,'PS-RAIGAD-FMD-01',officer,'positive',
 '[{"at":"2026-09-04T07:20:00Z","by":"Dr. Sana Shaikh","role":"field veterinarian","action":"Epithelial swab collected and sealed","status":"collected"},{"at":"2026-09-04T08:10:00Z","by":"Raigad cold-chain courier","role":"logistics","action":"Dispatched to district laboratory","status":"in_transit"},{"at":"2026-09-04T10:00:00Z","by":"Raigad District Laboratory","role":"laboratory","action":"Seal verified; sample received","status":"received"},{"at":"2026-09-04T12:40:00Z","by":"Raigad District Laboratory","role":"laboratory","action":"rRT-PCR result validated","status":"resulted"}]'::jsonb,
 'resulted',timestamptz '2026-09-04 07:20:00+00',timestamptz '2026-09-04 07:20:00+00',timestamptz '2026-09-04 10:00:00+00',timestamptz '2026-09-04 12:40:00+00','swab','FMD',
 'Synthetic demonstration sample from an animal with mouth and foot lesions.','FMD viral RNA detected by rRT-PCR. Synthetic demonstration result.'
 from cases c where c.report_id='a8100000-0000-4000-8000-000000000005'
 on conflict(barcode) do update set status='resulted',result='positive',result_summary=excluded.result_summary,custody_json=excluded.custody_json;

 delete from case_events where case_id in(select id from cases where report_id='a8100000-0000-4000-8000-000000000005') and note like 'Synthetic demo:%';
 insert into case_events(case_id,event_type,from_status,to_status,note,actor_id,created_at)
 select c.id,x.event_type,x.from_status,x.to_status,x.note,officer,x.at
 from cases c cross join (values
 ('status_changed','suspected','confirmed','Synthetic demo: officer confirmed the field signal.',timestamptz '2026-09-04 07:00:00+00'),
 ('assigned','confirmed','confirmed','Synthetic demo: Dr. Sana Shaikh assigned.',timestamptz '2026-09-04 07:05:00+00'),
 ('sample_created',null,'collected','Synthetic demo: sample PS-RAIGAD-FMD-01 created.',timestamptz '2026-09-04 07:20:00+00'),
 ('sample_status','collected','in_transit','Synthetic demo: cold-chain dispatch recorded.',timestamptz '2026-09-04 08:10:00+00'),
 ('sample_status','in_transit','received','Synthetic demo: district lab received sample.',timestamptz '2026-09-04 10:00:00+00'),
 ('sample_result','received','resulted','Synthetic demo: positive rRT-PCR result entered.',timestamptz '2026-09-04 12:40:00+00'),
 ('status_changed','confirmed','contained','Synthetic demo: movement restricted and ring vaccination begun.',timestamptz '2026-09-04 13:20:00+00')
 ) x(event_type,from_status,to_status,note,at)
 where c.report_id='a8100000-0000-4000-8000-000000000005';

 update reports set status='escalated',animal_id=coalesce(animal_id,animal) where id='a8100000-0000-4000-8000-000000000005';
 insert into alerts(severity,audience,district,channel,message_json,user_id,created_at)
 select 'info','farmer','Raigad','in_app',jsonb_build_object('type','case_contained_raigad_demo','case_id',c.id,
 'en','The FMD demonstration case near AIKTC has been contained. Follow the veterinary officer’s movement and vaccination advice.',
 'hi','AIKTC के पास FMD प्रदर्शन मामला नियंत्रित किया गया है। पशु चिकित्सा अधिकारी की आवाजाही और टीकाकरण सलाह मानें।',
 'mr','AIKTC जवळील FMD प्रात्यक्षिक प्रकरण नियंत्रणात आले आहे. पशुवैद्यकीय अधिकाऱ्यांच्या हालचाल व लसीकरण सूचनांचे पालन करा.'),farmer,timestamptz '2026-09-04 13:25:00+00'
 from cases c where c.report_id='a8100000-0000-4000-8000-000000000005'
 and not exists(select 1 from alerts a where a.user_id=farmer and a.message_json->>'type'='case_contained_raigad_demo');
end $$;
