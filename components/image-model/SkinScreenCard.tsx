"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { screenCattleSkin, type SkinScreenResult } from "@/lib/image-model/infer";

export function SkinScreenCard({ blob, species }: { blob: Blob; species: string }) {
  const t=useTranslations("imageModel");
  const [state,setState]=useState<{loading:boolean;result?:SkinScreenResult;error?:boolean}>({loading:true});
  useEffect(()=>{ let active=true; setState({loading:true});
    if(!["cattle","buffalo"].includes(species)){ setState({loading:false,error:true}); return; }
    screenCattleSkin(blob).then(result=>active&&setState({loading:false,result})).catch(()=>active&&setState({loading:false,error:true}));
    return()=>{active=false};
  },[blob,species]);
  if(state.loading) return <div className="rounded-xl border border-line bg-paper/60 p-4 text-[13px] text-mut"><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-sage"/>{t("analysing")}</div>;
  if(state.error) return <div className="rounded-xl border border-line bg-paper/60 p-4 text-[13px] text-mut">{t("unavailable")}</div>;
  const r=state.result!;
  const scores=[{key:"normal_appearing",value:r.probabilities.normal_appearing},{key:"lsd_like",value:r.probabilities.lsd_like},{key:"fmd_like",value:r.probabilities.fmd_like}];
  return <section className="rounded-xl border border-line bg-paper/60 p-4" aria-live="polite">
    <div className="flex items-start justify-between gap-3"><div><div className="text-[10.5px] font-bold uppercase tracking-[.12em] text-mut2">{t("eyebrow")}</div><h3 className="mt-1 text-[15px] font-bold">{t(`result.${r.interpretation}`)}</h3></div><span className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-semibold">{t(`broad.${r.broadScreen}`)}</span></div>
    <div className="mt-3 grid grid-cols-3 gap-2">{scores.map(s=><div key={s.key} className="rounded-lg border border-line bg-card p-2 text-center"><div className="text-[15px] font-bold">{Math.round(s.value*100)}%</div><div className="mt-0.5 text-[10.5px] text-mut">{t(`score.${s.key}`)}</div></div>)}</div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{t(`detail.${r.interpretation}`)}</p>
    <p className="mt-2 border-t border-line pt-2 text-[11.5px] leading-relaxed text-mut">{t("disclaimer")}</p>
  </section>;
}
