import { redirect } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TriageCard } from "@/components/triage/TriageCard";
import { TriageIcon } from "@/components/icons";
import { SpeciesIcon } from "@/components/SpeciesIcon";
import type { TriageRow } from "@/lib/triage/types";

interface ReportWithTriage {
  id: string;
  species: string;
  sick_count: number;
  dead_count: number;
  village: string | null;
  created_at: string;
  status: string;
  triage_results: TriageRow[];
}

export default async function TriagePage() {
  const t = await getTranslations();
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login");

  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, species, sick_count, dead_count, village, created_at, status, triage_results(disease_candidates, confidence, urgency, advisory_text, notifiable_flag, source)"
    )
    .eq("reporter_id", uid)
    .order("created_at", { ascending: false })
    .limit(20)
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
        <div className="mt-6 flex flex-col gap-5">
          {rows.map((r) => {
            const triage = r.triage_results.find(
              (x) => x.source === "rule_engine"
            );
            const meta = [
              t(`species.${r.species}`),
              `${t("report.sick")} ${r.sick_count}`,
              r.dead_count > 0 ? `${t("report.dead")} ${r.dead_count}` : null,
              r.village,
              format.dateTime(new Date(r.created_at), {
                day: "numeric",
                month: "short",
              }),
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={r.id}>
                {triage ? (
                  <TriageCard
                    candidates={triage.disease_candidates}
                    urgency={triage.urgency}
                    advisory={triage.advisory_text}
                    meta={meta}
                    species={r.species}
                  />
                ) : (
                  <div className="card flex items-center gap-4 px-5 py-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gold-soft text-[#8A6D1F]">
                      <SpeciesIcon species={r.species} className="h-6 w-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11.5px] font-medium text-mut2">
                        {meta}
                      </div>
                      <div className="mt-0.5 text-[14.5px] font-semibold">
                        {t("triage.pendingResult")}
                      </div>
                      <div className="progress-run mt-2 max-w-[260px]" />
                      <div className="mt-1.5 text-[11.5px] text-mut">
                        {t("triage.pendingHint")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
