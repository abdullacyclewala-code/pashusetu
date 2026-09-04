"use client";
import { useTranslations } from "next-intl";
import type { SkinScreenResult } from "@/lib/image-model/infer";
import type { TriageRow } from "@/lib/triage/types";

export function CombinedAssessment({triage,image}:{triage:TriageRow;image:SkinScreenResult}){
 const t=useTranslations("combinedAssessment");
 const rule=triage.disease_candidates[0]?.code?.toUpperCase();
 const visual=image.interpretation==="lsd_like"?"LSD":image.interpretation==="fmd_like"?"FMD":null;
 const state=visual&&rule===visual?"agree":visual?"different":image.interpretation==="normal_appearing"?"normalImage":"inconclusive";
 return <section className="card p-5">
  <div className="text-[10.5px] font-bold uppercase tracking-[.12em] text-mut2">{t("eyebrow")}</div>
  <h3 className="mt-1.5 font-serif text-lg font-semibold">{t(`${state}.title`)}</h3>
  <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{t(`${state}.body`)}</p>
  <div className="mt-3 rounded-xl border border-line bg-paper/70 px-3.5 py-3 text-[12px] leading-relaxed text-mut">{t("authority")}</div>
 </section>;
}
