-- ============================================================================
-- PashuSetu · P6 demo seed — idempotent.
-- Seeds the lab traceability journey + vaccination records/coverage gap.
-- ============================================================================
-- ids referenced by the running demo
--   case        ca25961a-8fe9-4615-8073-36f01b9528a5  (confirmed, AI, Pune)
--   animal      aa4e303a-8f33-406e-a29f-30231e9c8e22  (cattle Gir)
--   reporter    d9d1dc50-65a3-40c0-bca8-f0d7b2bd0f9f  (Test Farmer, Pune/Shirur)
--   officer     0af4c423-c36b-4a81-bf51-833915cfa161  (Dr. R. Deshmukh, Pune)

-- 1) a veterinarian to assign (assign-vet dropdown needs at least one row)
insert into public.vets (id, profile_id, name, phone, district, taluka)
values ('7c7c7c7c-0000-4000-8000-000000000001', null,
        'Dr. Aarti Patil', '9876500001', 'Pune', 'Shirur')
on conflict (id) do nothing;

-- 2) a completed lab sample for the confirmed case (barcode shown as a QR)
insert into public.samples
  (id, case_id, barcode, lab_id, result, status, specimen_type, disease_code,
   collected_at, received_at, resulted_at, result_summary, notes, custody_json, created_at)
values
  ('a1a1a1a1-0000-4000-8000-000000000001',
   'ca25961a-8fe9-4615-8073-36f01b9528a5',
   'PS-A1B2C3D4E5',
   '0af4c423-c36b-4a81-bf51-833915cfa161',
   'positive', 'resulted', 'swab', 'AI',
   now() - interval '2 days 6 hours',
   now() - interval '1 day 18 hours',
   now() - interval '1 day 3 hours',
   'Avian Influenza (H9N2) confirmed by real-time RT-PCR on oropharyngeal swab.',
   'Field swab collected from the affected animal on suspicion of notifiable influenza.',
   '[{"at": "2026-09-01T22:39:14Z", "by": "Dr. R. Deshmukh", "role": "veterinary officer", "action": "Sample collected from affected animal", "status": "collected"}, {"at": "2026-09-02T07:39:14Z", "by": "Courier", "role": "logistics", "action": "Sample dispatched to district laboratory", "status": "in_transit"}, {"at": "2026-09-02T10:39:14Z", "by": "District Lab", "role": "laboratory", "action": "Received at district laboratory", "status": "received"}, {"at": "2026-09-03T01:39:14Z", "by": "District Lab", "role": "laboratory", "action": "Result validated and entered", "status": "resulted"}]'::jsonb,
   now() - interval '2 days 6 hours')
on conflict (barcode) do nothing;

-- 3) vaccination record for the cattle animal (seed animal)
insert into public.vaccinations (id, animal_id, vaccine, dose_no, date, administered_by, campaign)
select 'f1f1f1f1-0000-4000-8000-000000000001',
       'aa4e303a-8f33-406e-a29f-30231e9c8e22', 'FMD', 1,
       (current_date - 300), 'Dr. Aarti Patil', 'National FMD Control Programme'
where not exists (select 1 from public.vaccinations where animal_id = 'aa4e303a-8f33-406e-a29f-30231e9c8e22' and vaccine = 'FMD');

-- 4) a second, unvaccinated animal on the same farm → coverage gap
insert into public.animals (id, owner_id, tag_id, species, breed, dob)
values ('aa4e303a-0000-4000-8000-000000000002',
        'd9d1dc50-65a3-40c0-bca8-f0d7b2bd0f9f',
        '123456789013', 'buffalo', 'Murrah', '2022-03-01')
on conflict (id) do nothing;
