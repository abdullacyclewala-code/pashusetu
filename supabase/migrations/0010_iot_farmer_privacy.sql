-- P9 correction: sensors belong to farmers. Officers receive district-level outbreak
-- intelligence, never another farmer's raw device or telemetry details.
drop policy if exists "devices district read" on public.devices;
create policy "devices owner read" on public.devices for select to authenticated
 using(owner_id=auth.uid() or public.my_role()='admin');
drop policy if exists "telemetry district read" on public.telemetry;
create policy "telemetry owner read" on public.telemetry for select to authenticated
 using(exists(select 1 from devices d where d.id=device_id and (d.owner_id=auth.uid() or public.my_role()='admin')));
drop policy if exists "iot anomalies district read" on public.iot_anomalies;
create policy "iot anomalies owner read" on public.iot_anomalies for select to authenticated
 using(exists(select 1 from devices d where d.id=device_id and (d.owner_id=auth.uid() or public.my_role()='admin')));

-- An IoT report remains private to its farmer until it contributes to an active/
-- confirmed district cluster. Manual app/WhatsApp reports keep existing visibility.
drop policy if exists "reports officials read" on public.reports;
create policy "reports officer district signals" on public.reports for select using(
 public.my_role()='admin' or (
   public.my_role() in ('officer','vet','lab') and district=public.my_district() and
   (source is distinct from 'iot' or exists(
     select 1 from public.clusters c where reports.id=any(c.member_ids) and c.status in ('active','confirmed')
   ))
 ));

-- Triage follows report visibility; removes the old unscoped official bypass.
drop policy if exists "triage visible" on public.triage_results;
create policy "triage follows visible report" on public.triage_results for select using(
 exists(select 1 from public.reports r where r.id=report_id)
);
