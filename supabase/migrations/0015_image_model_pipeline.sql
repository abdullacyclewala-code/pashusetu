-- Persist browser image-model inference without trusting arbitrary client rows.
-- The rule-engine row remains authoritative and is never updated here.
create or replace function public.save_image_model_result(p_report_id uuid, p_result jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_model text := p_result->>'modelVersion';
  v_interpretation text := p_result->>'interpretation';
  v_confidence numeric := nullif(p_result->>'confidence','')::numeric;
  v_probs jsonb := p_result->'probabilities';
  v_code text;
  v_name text;
  v_candidate jsonb;
begin
  select reporter_id into v_owner from reports where id = p_report_id;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'report not found or not owned by caller' using errcode = '42501';
  end if;
  if v_model <> 'cattle-skin-v2'
     or v_interpretation not in ('normal_appearing','lsd_like','fmd_like','inconclusive')
     or v_confidence is null or v_confidence < 0 or v_confidence > 1
     or jsonb_typeof(v_probs) <> 'object'
     or coalesce((v_probs->>'fmd_like')::numeric,-1) not between 0 and 1
     or coalesce((v_probs->>'normal_appearing')::numeric,-1) not between 0 and 1
     or coalesce((v_probs->>'lsd_like')::numeric,-1) not between 0 and 1 then
    raise exception 'invalid image model result' using errcode = '22023';
  end if;
  v_code := case v_interpretation when 'lsd_like' then 'LSD' when 'fmd_like' then 'FMD' else 'IMAGE_' || upper(v_interpretation) end;
  v_name := case v_interpretation when 'lsd_like' then 'LSD-like visual pattern' when 'fmd_like' then 'FMD-like visible pattern' when 'normal_appearing' then 'Normal-appearing skin' else 'Inconclusive visual screen' end;
  v_candidate := jsonb_build_object(
    'code',v_code,'name_en',v_name,'name_hi',null,'name_mr',null,
    'score',v_confidence,'confidence',v_confidence,'matched',jsonb_build_array(),
    'missed',jsonb_build_array(),'reasons',jsonb_build_array(),
    'zoonotic',false,'notifiable',v_interpretation in ('lsd_like','fmd_like'),
    'image_probabilities',v_probs,'interpretation',v_interpretation,'model_version',v_model
  );
  insert into triage_results(report_id,disease_candidates,confidence,urgency,advisory_text,notifiable_flag,source)
  values(p_report_id,jsonb_build_array(v_candidate),v_confidence,
    case when v_interpretation in ('lsd_like','fmd_like') then 'high' else 'low' end,
    'Non-diagnostic on-device visual screen. Symptom-based triage remains authoritative.',
    v_interpretation in ('lsd_like','fmd_like'),'image_model')
  on conflict(report_id,source) do update set
    disease_candidates=excluded.disease_candidates,confidence=excluded.confidence,
    urgency=excluded.urgency,advisory_text=excluded.advisory_text,
    notifiable_flag=excluded.notifiable_flag,created_at=now();
end;
$$;
revoke all on function public.save_image_model_result(uuid,jsonb) from public;
grant execute on function public.save_image_model_result(uuid,jsonb) to authenticated;
