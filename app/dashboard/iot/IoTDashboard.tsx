"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SpeciesIcon } from "@/components/SpeciesIcon";
import { createClient } from "@/lib/supabase/client";

type Device = { id:string; external_id:string; type:string; village:string; district:string; status:string; last_seen:string|null };
type Point = { id:string; device_id:string; ts:string; body_temp_c:number|null; rumination_min:number|null; activity:number|null; milk_yield_kg:number|null; env_temp_c:number|null; battery_pct:number|null };
type Anomaly = { id:string; device_id:string; ts:string; severity:string; concurrent_devices:number; report_id:string|null; deviations:Record<string,number> };
type SensorReport = { id:string; created_at:string; status:string; sick_count:number; village:string|null };

const HEALTHY_TEMP = 39.5;
function shortId(id:string) { return id.replace("PS-COLLAR-", ""); }
function n(value:number|null|undefined, digits=1) { return value == null ? "—" : Number(value).toFixed(digits); }

function Trend({ values, colour, min, max }:{ values:number[]; colour:string; min:number; max:number }) {
  const points = values.length < 2 ? "0,54 100,54" : values.map((v,i) => {
    const x=i*100/(values.length-1); const y=64-Math.max(0,Math.min(1,(v-min)/(max-min)))*50;
    return `${x},${y}`;
  }).join(" ");
  return <svg viewBox="0 0 100 70" preserveAspectRatio="none" className="h-24 w-full" aria-hidden="true">
    <defs><linearGradient id={`fill-${colour.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={colour} stopOpacity=".22"/><stop offset="1" stopColor={colour} stopOpacity="0"/></linearGradient></defs>
    <path d="M0 64H100" stroke="#e8dfd1" strokeWidth=".7" vectorEffect="non-scaling-stroke"/>
    <polygon points={`0,64 ${points} 100,64`} fill={`url(#fill-${colour.slice(1)})`}/>
    <polyline points={points} fill="none" stroke={colour} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
  </svg>;
}

export function IoTDashboard({ initialDevices, initialTelemetry, initialAnomalies, initialReports }:{ initialDevices:Device[]; initialTelemetry:Point[]; initialAnomalies:Anomaly[]; initialReports:SensorReport[] }) {
  const t=useTranslations("iot");
  const [devices]=useState(initialDevices); const [telemetry,setTelemetry]=useState(initialTelemetry);
  const [anomalies,setAnomalies]=useState(initialAnomalies); const [reports,setReports]=useState(initialReports);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const db=useMemo(()=>createClient(),[]);

  useEffect(()=>{ const channel=db.channel("iot-live")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"telemetry"},p=>setTelemetry(x=>[p.new as Point,...x].slice(0,120)))
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"iot_anomalies"},p=>setAnomalies(x=>[p.new as Anomaly,...x]))
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"reports",filter:"source=eq.iot"},p=>setReports(x=>[p.new as SensorReport,...x]))
    .subscribe(); return()=>{db.removeChannel(channel)}; },[db]);

  async function act(action:"run"|"reset") { setBusy(true); setError(""); try {
    const response=await fetch("/api/iot/simulate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action})});
    const result=await response.json(); if(!response.ok) throw new Error(result.error);
    if(action==="reset"){setTelemetry([]);setAnomalies([]);setReports([]);} else location.reload();
  } catch(e){setError(e instanceof Error?e.message:t("error"));} finally{setBusy(false);} }

  const byDevice=useMemo(()=>new Map(devices.map(d=>[d.id,telemetry.filter(p=>p.device_id===d.id).sort((a,b)=>b.ts.localeCompare(a.ts))])),[devices,telemetry]);
  const all=[...telemetry].sort((a,b)=>a.ts.localeCompare(b.ts));
  const latest=all.at(-1); const hasWarning=anomalies.length>0; const connected=devices.filter(d=>d.status==="active").length;

  return <div className="mt-6 space-y-5">
    {/* One calm answer first: is my herd okay? */}
    <section className={`overflow-hidden rounded-[28px] border shadow-[var(--shadow-card)] ${hasWarning?"border-[#e8b9aa] bg-[#fffaf7]":"border-[#d9dfc4] bg-[#fbfcf5]"}`}>
      <div className="grid items-center gap-5 p-5 sm:grid-cols-[1fr_auto] sm:p-7">
        <div className="flex items-start gap-4">
          <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${hasWarning?"bg-[#F9E3DB] text-[#A8431F]":"bg-[#e8eed6] text-[#60733c]"}`}><SpeciesIcon species="cattle" className="h-9 w-9"/></span>
          <div><div className="text-[11px] font-bold uppercase tracking-[.12em] text-mut">{t("herdStatus")}</div>
            <h2 className="mt-1 font-serif text-[26px] font-semibold leading-tight">{hasWarning?t("needsAttention"):t("allLooksNormal")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-mut">{hasWarning?t("attentionBody"):t("normalBody")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-white/70 px-4 py-3"><span className="relative h-2.5 w-2.5 rounded-full bg-[#71834b] after:absolute after:inset-[-4px] after:rounded-full after:border after:border-[#71834b]/30"/><div><b className="block text-sm">{t("connected",{count:connected})}</b><span className="text-[11px] text-mut">{t("sendingSafely")}</span></div></div>
      </div>
      {hasWarning&&<div className="flex flex-col gap-3 border-t border-[#ead8d0] bg-[#F9E3DB]/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-[#8d3c22]">{t("warningAction")}</p><Link href="/dashboard/report" className="rounded-full bg-accent px-4 py-2.5 text-center text-sm font-bold text-white">{t("manualReport")}</Link></div>}
    </section>

    {/* Three real animals, not a technical device inventory */}
    <section><div className="mb-3 flex items-end justify-between"><div><h2 className="font-serif text-xl font-semibold">{t("myAnimals")}</h2><p className="mt-1 text-xs text-mut">{t("animalHint")}</p></div></div>
      <div className="grid gap-3 md:grid-cols-3">{devices.map((d,index)=>{const p=byDevice.get(d.id)?.[0];const hot=(p?.body_temp_c??0)>HEALTHY_TEMP;const a=anomalies.find(x=>x.device_id===d.id);return <article key={d.id} className="card overflow-hidden">
        <div className="flex items-center gap-3 p-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent"><SpeciesIcon species="cattle" className="h-7 w-7"/></span><div><h3 className="font-bold">{t("animalNumber",{number:index+1})}</h3><p className="text-[11px] text-mut">{t("collarNumber",{number:shortId(d.external_id)})}</p></div><span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold ${a?"bg-[#F9E3DB] text-[#A8431F]":"bg-[#e8eed6] text-[#60733c]"}`}>{a?t("checkAnimal"):t("normal")}</span></div>
        <div className="grid grid-cols-2 border-t border-line-2"><div className="border-r border-line-2 p-3.5"><span className="text-[10.5px] text-mut">{t("temperature")}</span><div className={`mt-1 font-serif text-xl font-semibold ${hot?"text-[#A8431F]":""}`}>{n(p?.body_temp_c)}°C</div></div><div className="p-3.5"><span className="text-[10.5px] text-mut">{t("rumination")}</span><div className="mt-1 font-serif text-xl font-semibold">{n(p?.rumination_min,0)} <small className="font-sans text-[10px] font-normal text-mut">{t("minutes")}</small></div></div></div>
      </article>})}</div>
    </section>

    {/* Demo told as a short story */}
    <section className="card overflow-hidden"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-serif text-xl font-semibold">{t("demoTitle")}</h2><p className="mt-1 max-w-xl text-xs leading-relaxed text-mut">{t("demoBody")}</p></div><div className="flex gap-2"><button disabled={busy} onClick={()=>act("reset")} className="rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{t("reset")}</button><button disabled={busy} onClick={()=>act("run")} className="rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy?t("running"):t("runDemo")}</button></div></div>
      <div className="grid border-t border-line-2 sm:grid-cols-3">{[["01",t("storyHealthy"),t("storyHealthyBody")],["02",t("storyHeat"),t("storyHeatBody")],["03",t("storyIllness"),t("storyIllnessBody")]].map((s,i)=><div key={s[0]} className={`flex gap-3 p-4 ${i<2?"border-b border-line-2 sm:border-r sm:border-b-0":""}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line font-mono text-[11px] font-bold text-accent">{s[0]}</span><div><b className="text-sm">{s[1]}</b><p className="mt-1 text-xs leading-relaxed text-mut">{s[2]}</p></div></div>)}</div>{error&&<p className="border-t border-line bg-[#F9E3DB] p-3 text-sm text-[#A8431F]">{error}</p>}
    </section>

    {telemetry.length>0&&<section className="card p-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-serif text-xl font-semibold">{t("simpleTrends")}</h2><p className="mt-1 text-xs text-mut">{t("trendHint")}</p></div><span className="chip text-[10px]">{t("latestReading",{temp:n(latest?.body_temp_c),rum:n(latest?.rumination_min,0)})}</span></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-line p-4"><div className="flex justify-between text-xs"><b>{t("temperature")}</b><span className="text-mut">37–42°C</span></div><Trend values={all.map(x=>Number(x.body_temp_c)).filter(Number.isFinite)} colour="#A8431F" min={37} max={42}/></div><div className="rounded-2xl border border-line p-4"><div className="flex justify-between text-xs"><b>{t("rumination")}</b><span className="text-mut">{t("moreIsHealthy")}</span></div><Trend values={all.map(x=>Number(x.rumination_min)).filter(Number.isFinite)} colour="#71834b" min={100} max={500}/></div></div>
    </section>}

    {reports.length>0&&<section className="card p-5"><h2 className="font-serif text-xl font-semibold">{t("whatHappened")}</h2><div className="mt-4 space-y-3">{reports.slice(0,3).map((r,i)=><div key={r.id} className="flex gap-3 rounded-2xl border border-line p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F9E3DB] text-sm font-bold text-[#A8431F]">{i+1}</span><div><b className="text-sm">{t("privateSignalCreated",{count:r.sick_count})}</b><p className="mt-1 text-xs leading-relaxed text-mut">{t("privateSignalBody")}</p></div></div>)}</div></section>}

    <section className="rounded-2xl border border-gold bg-gold-soft p-4"><b className="text-xs">{t("privacyTitle")}</b><p className="mt-1 text-xs leading-relaxed text-ink-2">{t("privacyNote")}</p><p className="mt-2 border-t border-gold/50 pt-2 text-[11px] text-mut">{t("disclaimer")}</p></section>
  </div>;
}
