-- Reports submitted with a manual/profile village but no GPS still need a map point.
-- Use the registered village centroid; real GPS, when available, remains more precise.
create or replace function public.resolve_village_point(p_village text,p_taluka text,p_district text)
returns text language sql stable set search_path=public as $$
 select 'SRID=4326;POINT('||st_x(v.geo::geometry)||' '||st_y(v.geo::geometry)||')'
 from villages v where lower(v.name)=lower(p_village) and lower(v.district)=lower(p_district)
 order by case when lower(v.taluka)=lower(coalesce(p_taluka,'')) then 0 else 1 end limit 1
$$;
grant execute on function public.resolve_village_point(text,text,text) to authenticated;

-- Backfill existing demo/manual reports, including the recent poultry report.
update reports r set geo=(select v.geo from villages v where lower(v.name)=lower(r.village) and lower(v.district)=lower(r.district) order by case when lower(v.taluka)=lower(coalesce(r.taluka,'')) then 0 else 1 end limit 1)
where r.geo is null and r.village is not null and r.district is not null
  and exists(select 1 from villages v where lower(v.name)=lower(r.village) and lower(v.district)=lower(r.district));
