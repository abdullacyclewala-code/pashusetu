-- ============================================================================
-- PashuSetu · 0002_report_flow.sql — Part 1
-- Report photos storage + sync-related indexes.
--
-- Anchor B note (offline sync correctness): reports.id is CLIENT-GENERATED
-- (crypto.randomUUID() at capture time) and is the primary key, so offline
-- replays are idempotent — a retried upsert on the same id can never create
-- a duplicate row. Ordered replay + delete-after-confirm live in
-- lib/offline/sync.ts.
-- ============================================================================

-- Storage bucket for report photos (public read, owner-scoped writes)
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

create policy "report photos: upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "report photos: update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "report photos: public read" on storage.objects
  for select to public
  using (bucket_id = 'report-photos');

-- Fast "my recent reports" queries
create index if not exists reports_reporter_created_idx
  on public.reports (reporter_id, created_at desc);
