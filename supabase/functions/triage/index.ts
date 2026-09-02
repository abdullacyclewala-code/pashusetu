/**
 * Triage Edge Function — invoked by the on_report_created DB trigger
 * (and re-invokable manually; the write is idempotent per report+source).
 *
 * body: { "report_id": "<uuid>" }
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { runTriage, buildAdvisory, type DiseaseRow } from "./engine.ts";

const SECRET = Deno.env.get("TRIAGE_WEBHOOK_SECRET") ?? "ps-triage-hook-v1";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({ error: "method not allowed" }, 405);
    }
    if (req.headers.get("x-triage-secret") !== SECRET) {
      return json({ error: "unauthorized" }, 401);
    }

    const { report_id } = await req.json().catch(() => ({}));
    if (typeof report_id !== "string" || !report_id) {
      return json({ error: "report_id required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select(
        "id, species, symptoms, sick_count, dead_count, district, offline_ts, created_at"
      )
      .eq("id", report_id)
      .single();
    if (reportError || !report) {
      return json({ error: `report not found: ${reportError?.message}` }, 404);
    }

    const { data: kb, error: kbError } = await supabase
      .from("diseases")
      .select(
        "code, name_en, name_hi, name_mr, species, symptoms, zoonotic, notifiable, seasonality"
      )
      .returns<DiseaseRow[]>();
    if (kbError || !kb?.length) {
      return json({ error: `knowledge base unavailable: ${kbError?.message}` }, 500);
    }

    // district prior: similar triaged reports nearby in the last 14 days
    const nearbyCounts: Record<string, number> = {};
    if (report.district) {
      const since = new Date(Date.now() - 14 * 86400_000).toISOString();
      const { data: nearby } = await supabase
        .from("triage_results")
        .select("disease_candidates, reports!inner(district, created_at)")
        .eq("reports.district", report.district)
        .gte("reports.created_at", since)
        .neq("report_id", report.id)
        .limit(300);
      for (const row of nearby ?? []) {
        const code = (row.disease_candidates as { code?: string }[])?.[0]?.code;
        if (code) nearbyCounts[code] = (nearbyCounts[code] ?? 0) + 1;
      }
    }

    const capturedAt = new Date(report.offline_ts ?? report.created_at);
    const result = runTriage(
      {
        species: report.species,
        symptoms: Array.isArray(report.symptoms) ? report.symptoms : [],
        sickCount: report.sick_count,
        deadCount: report.dead_count,
        month: capturedAt.getUTCMonth() + 1,
        nearbyCounts,
      },
      kb
    );

    const { error: writeError } = await supabase.from("triage_results").upsert(
      {
        report_id: report.id,
        disease_candidates: result.candidates,
        confidence: result.confidence,
        urgency: result.urgency,
        advisory_text: buildAdvisory(result),
        advisory_lang: "en",
        notifiable_flag: result.notifiable,
        source: "rule_engine",
      },
      { onConflict: "report_id,source" }
    );
    if (writeError) return json({ error: writeError.message }, 500);

    await supabase
      .from("reports")
      .update({ status: "triaged" })
      .eq("id", report.id)
      .eq("status", "pending");

    return json({ ok: true, urgency: result.urgency, top: result.candidates[0]?.code ?? null });
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "internal error" },
      500
    );
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
