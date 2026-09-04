// Nightly P8 orchestrator: fetches Open-Meteo covariates, then runs the audited SQL model.
// Invoke with x-cron-secret. A date override exists only for deterministic demos/backfills.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"content-type":"application/json"};

// Decode a PostGIS geography/geometry `geo` column. PostgREST returns the
// `geo` column as EWKB hex (e.g. "0101000020E6100000..."), NOT GeoJSON
// `{coordinates}` and there is no `location` column on `villages` — so we
// must decode the EWKB POINT to {lng, lat} before calling Open-Meteo.
function ewkbToLngLat(hex: string | null | undefined): { lng: number; lat: number } | null {
  if (!hex) return null;
  const clean = String(hex).replace(/^0x/, "");
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length < 25) return null;
  const parts = clean.match(/.{2}/g);
  if (!parts) return null;
  const buf = new Uint8Array(parts.map((b) => parseInt(b, 16)));
  const le = buf[0] === 1;
  const readU32 = (o: number): number => (le ? buf[o] | (buf[o+1]<<8) | (buf[o+2]<<16) | (buf[o+3]<<24) : (buf[o]<<24) | (buf[o+1]<<16) | (buf[o+2]<<8) | buf[o+3]);
  const readF64 = (o: number): number => {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    return le ? dv.getFloat64(o, true) : dv.getFloat64(o, false);
  };
  const type = readU32(1) >>> 0;
  if ((type & 0x0f) !== 1) return null; // not a POINT
  const lng = readF64(9);
  const lat = readF64(17);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

Deno.serve(async(req)=>{
  if(req.method!=="POST") return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:cors});
  const expected=Deno.env.get("EARLY_WARNING_CRON_SECRET");
  if(!expected || req.headers.get("x-cron-secret")!==expected) return new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:cors});
  try {
    const body=await req.json().catch(()=>({}));
    const asOf=typeof body.as_of==="string"?body.as_of:new Date().toISOString().slice(0,10);
    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data: dairies,error:dairyError}=await db.from("milk_collections").select("village,district").gte("date",`${asOf.slice(0,7)}-01`);
    if(dairyError) throw dairyError;
    const unique=[...new Map((dairies??[]).map((d:{village:string;district:string})=>[`${d.village}|${d.district}`,d])).values()];
    const weatherErrors:string[]=[];
    for(const d of unique as Array<{village:string;district:string}>){
      const {data:v}=await db.from("villages").select("geo").eq("name",d.village).eq("district",d.district).maybeSingle();
      // Open-Meteo needs coordinates. Decode the PostGIS EWKB POINT stored in
      // `villages.geo` (PostgREST returns it as EWKB hex, not GeoJSON).
      const coords=v?.geo?ewkbToLngLat(v.geo):null;
      if(!coords) continue;
      try{
        const u=new URL("https://api.open-meteo.com/v1/forecast");
        u.searchParams.set("latitude",String(coords.lat));u.searchParams.set("longitude",String(coords.lng));
        u.searchParams.set("daily","temperature_2m_max,rain_sum");u.searchParams.set("hourly","relative_humidity_2m");u.searchParams.set("past_days","2");u.searchParams.set("forecast_days","2");u.searchParams.set("timezone","Asia/Kolkata");
        const res=await fetch(u,{signal:AbortSignal.timeout(8000)});if(!res.ok) throw new Error(`HTTP ${res.status}`);const w=await res.json();
        const rows=(w.daily?.time??[]).map((date:string,i:number)=>{const hs=(w.hourly?.relative_humidity_2m??[]).slice(i*24,(i+1)*24);return {village:d.village,district:d.district,date,temperature_max_c:w.daily.temperature_2m_max[i],rainfall_mm:w.daily.rain_sum[i],humidity_mean_pct:hs.length?hs.reduce((a:number,b:number)=>a+b,0)/hs.length:null};});
        if(rows.length){const {error}=await db.from("weather_daily").upsert(rows);if(error)throw error;}
      }catch(e){weatherErrors.push(`${d.village}: ${e instanceof Error?e.message:"weather error"}`);}
    }
    const {data,error}=await db.rpc("run_early_warning",{p_as_of:asOf,p_district:body.district??null});if(error)throw error;
    return new Response(JSON.stringify({ok:true,result:data,weatherWarnings:weatherErrors}),{headers:cors});
  }catch(e){console.error(e);return new Response(JSON.stringify({error:"Early-warning run failed"}),{status:500,headers:cors});}
});
