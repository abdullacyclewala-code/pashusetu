-- ============================================================================
-- PashuSetu · 0003_triage.sql — Part 2
-- Auto-triage every new report: AFTER INSERT trigger → pg_net POST to the
-- `triage` Edge Function. Covers ALL ingest paths (online form, offline sync,
-- future WhatsApp/IVR/IoT) because they all end as a reports INSERT.
-- ============================================================================

-- one triage result per report per source (idempotent recompute)
create unique index if not exists triage_results_report_source_idx
  on public.triage_results (report_id, source);

create extension if not exists pg_net;

-- NOTE: the webhook secret is a low-value shared token (the function only
-- recomputes triage for an existing report id). Rotate via:
--   supabase secrets set TRIAGE_WEBHOOK_SECRET=... + update this function.
create or replace function public.trigger_triage()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://exodvcbeuyszvaelumra.supabase.co/functions/v1/triage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-triage-secret', 'ps-triage-hook-v1'
    ),
    body := jsonb_build_object('report_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists on_report_created on public.reports;
create trigger on_report_created
  after insert on public.reports
  for each row execute function public.trigger_triage();
