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
  const r=state.result!; const pct=Math.round(r.probability*100);
  return <section className="rounded-xl border border-line bg-paper/60 p-4" aria-live="polite">
    <div className="flex items-start justify-between gap-3"><div><div className="text-[10.5px] font-bold uppercase tracking-[.12em] text-mut2">{t("eyebrow")}</div><h3 className="mt-1 text-[15px] font-bold">{t(`result.${r.interpretation}`)}</h3></div><span className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-semibold">{t(`broad.${r.broadScreen}`)}</span></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{width:`${pct}%`}}/></div>
    <div className="mt-1 flex justify-between text-[11px] text-mut"><span>{t("healthyEnd")}</span><span>{t("lsdEnd")}</span></div>
    <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{t(`detail.${r.interpretation}`)}</p>
    <p className="mt-2 border-t border-line pt-2 text-[11.5px] leading-relaxed text-mut">{t("disclaimer")}</p>
  </section>;
}
