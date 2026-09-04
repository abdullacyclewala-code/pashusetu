-- P9 demo registry: exact same schema/protocol a real collar would use.
insert into public.devices(external_id,type,animal_id,owner_id,village,block,district,lat,lng,protocol,status,api_key_hash)
select x.external_id,'neck_collar',a.id,p.id,'Khandagaon (AIKTC)','Panvel','Raigad',19.0000386,73.1045685,'http','active','a2ac190dcffc585d5d56916c02d2f416702f1c855562bd98a6b52d4fc68a2dd5'
from (values('PS-COLLAR-001'),('PS-COLLAR-002'),('PS-COLLAR-003')) x(external_id)
cross join lateral (select p.id from public.profiles p join auth.users u on u.id=p.id where u.email='test.farmer@pashusetu.dev' limit 1) p
left join lateral (select id from public.animals where owner_id=p.id order by created_at limit 1 offset case x.external_id when 'PS-COLLAR-001' then 0 else 1 end) a on true
on conflict(external_id) do update set api_key_hash=excluded.api_key_hash,status='active';
