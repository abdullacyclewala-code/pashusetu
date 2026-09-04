import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const [forecasts, signals] = await Promise.all([
    supabase.from("district_risk_forecasts").select("*").order("forecast_date", { ascending:false }).order("risk_score", { ascending:false }).limit(30),
    supabase.from("dairy_anomalies").select("id,village,block,district,date,observed_yield,seasonal_baseline,weather_adjustment,residual_z,consecutive_days,status,reason").in("status",["watch","field_verify"]).order("date",{ascending:false}).limit(30),
  ]);
  if (forecasts.error || signals.error) return NextResponse.json({ error:"Forecast data is temporarily unavailable" },{status:503});
  return NextResponse.json({ generatedAt:new Date().toISOString(), forecasts:forecasts.data??[], dairySignals:signals.data??[] }, { headers:{"Cache-Control":"private, max-age=60"} });
}
