-- ============================================================================
-- PashuSetu · seed_cluster.sql — Part 5 demo data
-- Seed a DETECTABLE outbreak so P5 can be demonstrated without waiting for
-- real field reports: six cattle reports with the SAME top triaged disease
-- (FMD) at points within ~1 km of each other near Shirur, Pune, all inside the
-- 72 h detection window.
--
-- Idempotent: fixed UUIDs + on-conflict-do-nothing. The reports INSERT fires
-- the existing trigger_triage (pg_net → triage function) and we insert the
-- triage_results directly so cluster detection triggers immediately.
-- detection crosses the 3-case threshold → one district alert is created.
--
-- Run after supabase/migrations/0005_clusters.sql is applied.
-- ============================================================================

-- One candidate JSON for the FMD top candidate (matches lib/triage/types.ts).
-- Represented once here and reused — Postgres literal substitution below.

insert into public.reports
  (id, reporter_id, species, symptoms, free_text, sick_count, dead_count,
   geo, village, taluka, district, status, offline_ts, created_at)
values
  ('33333333-3333-3333-3333-333333333301', 'd9d1dc50-65a3-40c0-bca8-f0d7b2bd0f9f', 'cattle',
   '["fever","mouth_blisters","drooling","lameness","foot_lesions"]', 'Three cattle drooling badly near the well.', 2, 0,
   st_setsrid(st_makepoint(74.3732, 18.8276), 4326)::geography, 'Shirur', 'Shirur', 'Pune', 'triaged',
   now() - interval '1 day', now() - interval '1 day'),
  ('33333333-3333-3333-3333-333333333302', 'd9d1dc50-65a3-40c0-bca8-f0d7b2bd0f9f', 'cattle',
   '["fever","mouth_blisters","drooling","lameness","foot_lesions"]', 'Runny mouth and lame cow.', 1, 0,
   st_setsrid(st_makepoint(74.3750, 18.8320), 4326)::geography, 'Shirur', 'Shirur', 'Pune', 'triaged',
   now() - interval '1 day 2 hours', now() - interval '1 day 2 hours'),
  ('33333333-3333-3333-3333-333333333303', 'd9d1dc50-65a3-40c0-bca8-f0d7b2bd0f9f', 'cattle',
   '["fever","mouth_blisters","drooling","lameness","foot_lesions"]', 'Three animals down, not eating.', 3, 0,
   st_setsrid(st_makepoint(74.3700, 18.8250), 4326)::geography, 'Shirur', 'Shirur', 'Pune', 'triaged',
   now() - interval '22 hours', now() - interval '22 hours'),
  ('33333333-3333-3333-3333-333333333304', 'd9d1dc50-65a3-40c0-bca8-f0d7b2bd0f9f', 'cattle',
   '["fever","mouth_blisters","drooling","lameness","foot_lesions"]', 'Sores on the mouth and feet.', 1, 0,
   st_setsrid(st_makepoint(74.3780, 18.8300), 4326)::geography, 'Shirur', 'Shirur', 'Pune', 'triaged',
   now() - interval '1 day 10 hours', now() - interval '1 day 10 hours'),
  ('33333333-3333-3333-3333-333333333305', 'd9d1dc50-65a3-40c0-bca8-f0d7b2bd0f9f', 'cattle',
   '["fever","mouth_blisters","drooling","lameness","foot_lesions"]', 'Same farm — a fifth sick animal.', 1, 0,
   st_setsrid(st_makepoint(74.3760, 18.8200), 4326)::geography, 'Shirur', 'Shirur', 'Pune', 'triaged',
   now() - interval '20 hours', now() - interval '20 hours'),
  ('33333333-3333-3333-3333-333333333306', 'd9d1dc50-65a3-40c0-bca8-f0d7b2bd0f9f', 'cattle',
   '["fever","mouth_blisters","drooling","lameness","foot_lesions"]', 'Cattle drooling, refusing feed.', 1, 0,
   st_setsrid(st_makepoint(74.3690, 18.8280), 4326)::geography, 'Shirur', 'Shirur', 'Pune', 'triaged',
   now() - interval '18 hours', now() - interval '18 hours')
on conflict (id) do nothing;

-- Direct triage_results (the async trigger_triage will recompute the same FMD
-- top candidate via the rule engine; this insert also fires detect_clusters).
insert into public.triage_results
  (report_id, disease_candidates, confidence, urgency, advisory_text, advisory_lang,
   notifiable_flag, source, created_at)
select
  r.id,
  '[{"code":"FMD","name_en":"Foot and Mouth Disease","name_hi":"खुरपका-मुंहपका रोग","name_mr":"लाळ्या खुरकूत","score":1.056,"confidence":0.9,"matched":["fever","mouth_blisters","drooling","lameness","foot_lesions"],"missed":["reduced_appetite","milk_drop"],"reasons":[{"key":"symptom_match","matched":5,"total":7},{"key":"hallmark","symptom":"fever"},{"key":"hallmark","symptom":"mouth_blisters"},{"key":"season"},{"key":"notifiable"}],"zoonotic":false,"notifiable":true}]'::jsonb,
  0.9,
  'critical',
  'Suspected: Foot and Mouth Disease. Isolate sick animals immediately. Consult a vet.',
  'en',
  true,
  'rule_engine',
  now()
from public.reports r
where r.id in (
  '33333333-3333-3333-3333-333333333301',
  '33333333-3333-3333-3333-333333333302',
  '33333333-3333-3333-3333-333333333303',
  '33333333-3333-3333-3333-333333333304',
  '33333333-3333-3333-3333-333333333305',
  '33333333-3333-3333-3333-333333333306'
)
  and not exists (
    select 1 from public.triage_results t where t.report_id = r.id and t.source = 'rule_engine'
  );

-- Deterministically re-run detection once (the trigger already ran per row, so
-- this is a safe, idempotent safety net) so the cluster + alert exist now.
select public.detect_clusters();
