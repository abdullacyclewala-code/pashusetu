"use client";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { DairySignal, RiskForecast } from "@/lib/forecast/types";
const RiskMap=dynamic(()=>import("./RiskMap").then(m=>m.RiskMap),{ssr:false,loading:()=> <div className="skel h-[260px] rounded-[18px]"/>});

export function EarlyWarningPanel({forecasts,signals,points}:{forecasts:RiskForecast[];signals:DairySignal[];points:Array<{lat:number;lng:number;title:string;level:"low"|"medium"|"high";score:number}>}){
 const t=useTranslations("forecast"); const top=forecasts[0]; const flagged=signals.filter(s=>s.status==="field_verify");
 return <section className="card overflow-hidden" aria-labelledby="forecast-title">
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-2 p-5">
   <div><div className="eyebrow">{t("eyebrow")}</div><h2 id="forecast-title" className="font-serif text-xl font-semibold">{t("title")}</h2><p className="mt-1 text-[12.5px] text-mut">{t("hint")}</p></div>
   {top&&<div className={`rounded-2xl px-4 py-2 text-right ${top.risk_level==="high"?"bg-[#F9E3DB] text-[#A8431F]":top.risk_level==="medium"?"bg-[#FBF3DC] text-[#8A6D1F]":"bg-[#EDF0DE] text-[#5E6E3E]"}`}><div className="text-[10px] font-bold uppercase tracking-wider">{t(`level.${top.risk_level}`)}</div><div className="font-serif text-2xl font-semibold">{Math.round(top.risk_score)}<span className="text-sm">/100</span></div></div>}
  </div>
  <div className="grid gap-0 lg:grid-cols-[1.25fr_.75fr]">
   <div className="border-b border-line-2 p-2 lg:border-b-0 lg:border-r"><RiskMap points={points}/></div>
   <div className="p-5">
    <h3 className="text-sm font-bold">{t("signals")}</h3>
    {flagged.length===0?<p className="mt-4 text-sm text-mut">{t("noSignals")}</p>:<div className="mt-3 space-y-3">{flagged.slice(0,4).map(s=><article key={s.id} className="rounded-2xl border border-line bg-paper/50 p-3"><div className="flex justify-between gap-2"><b className="text-sm">{s.village}</b><span className="chip text-[10px]">{t("verify")}</span></div><p className="mt-1 text-xs text-mut">{t("dip",{days:s.consecutive_days,z:Math.abs(s.residual_z).toFixed(1)})}</p><div className="mt-2 flex gap-3 text-[11px]"><span>{t("observed")}: {Number(s.observed_yield).toFixed(1)} kg</span><span>{t("expected")}: {(Number(s.seasonal_baseline)+Number(s.weather_adjustment)).toFixed(1)} kg</span></div></article>)}</div>}
    <div className="mt-4 rounded-2xl bg-accent-soft p-3 text-[11.5px] leading-relaxed text-ink-2">{t("method")}</div>
   </div>
  </div>
 </section>
}
