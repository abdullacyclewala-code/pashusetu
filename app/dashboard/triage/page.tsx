import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TriageIcon } from "@/components/icons";
import { TriageClient } from "./TriageClient";
import type { TriageRow } from "@/lib/triage/types";

interface ReportWithTriage {
  id: string;
  species: string;
  symptoms: string[];
  sick_count: number;
  dead_count: number;
  village: string | null;
  taluka: string | null;
  district: string | null;
  created_at: string;
  status: string;
  photo_url: string | null;
  free_text: string | null;
  animal_id: string | null;
  offline_ts: string | null;
  triage_results: TriageRow[];
}

export default async function TriagePage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login");

  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, species, symptoms, sick_count, dead_count, village, taluka, district, created_at, status, photo_url, free_text, animal_id, offline_ts, triage_results(disease_candidates, confidence, urgency, advisory_text, notifiable_flag, source, created_at)"
    )
    .eq("reporter_id", uid)
    .order("created_at", { ascending: false })
    .limit(30)
    .returns<ReportWithTriage[]>();

  const rows = reports ?? [];

  return (
    <section className="page-in">
      <div className="eyebrow">{t("triage.eyebrow")}</div>
      <div className="h1">{t("triage.heading")}</div>
      <p className="lede">{t("triage.lede")}</p>

      {rows.length === 0 ? (
        <div className="empty">
          <span className="e-ico">
            <TriageIcon />
          </span>
          <div className="e-t">{t("triage.emptyTitle")}</div>
          <div className="e-s">{t("triage.emptyNow")}</div>
        </div>
      ) : (
        <TriageClient reports={rows} />
      )}
    </section>
  );
}
