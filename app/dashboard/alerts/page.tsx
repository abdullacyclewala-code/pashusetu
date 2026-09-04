import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/data/session";
import { AlertsClient } from "./AlertsClient";
import type { AlertRow, ClusterRow } from "@/lib/alerts/types";
import type { DairySignal, RiskForecast } from "@/lib/forecast/types";
import { EarlyWarningPanel } from "./EarlyWarningPanel";

const ALERTS_SELECT =
  "id, severity, audience, district, channel, read, created_at, message_json";
const CLUSTERS_SELECT =
  "id, disease_guess, case_count, radius_km, district, village, severity, status, first_seen, last_seen, created_at, lat, lng, " +
  "diseases:clusters_disease_guess_fkey(code, name_en, name_hi, name_mr)";

export default async function AlertsPage() {
  const t = await getTranslations("alerts");
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const [alertsRes, clustersRes, forecastRes, signalRes, villageRes] = await Promise.all([
    supabase
      .from("alerts")
      .select(ALERTS_SELECT)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<AlertRow[]>(),
    supabase
      .from("clusters")
      .select(CLUSTERS_SELECT)
      .order("created_at", { ascending: false })
      .limit(25)
      .returns<ClusterRow[]>(),
    supabase.from("district_risk_forecasts").select("*").order("forecast_date", { ascending: false }).order("risk_score", { ascending: false }).limit(20).returns<RiskForecast[]>(),
    supabase.from("dairy_anomalies").select("id,village,block,district,date,observed_yield,seasonal_baseline,weather_adjustment,residual_z,consecutive_days,status,reason").in("status", ["watch","field_verify"]).order("date", { ascending:false }).limit(20).returns<DairySignal[]>(),
    supabase.from("villages").select("name,taluka,district,lat,lng"),
  ]);

  const allAlerts = alertsRes.data ?? [];
  const activeClusters = (clustersRes.data ?? []).filter(
    (c) => c.status === "active"
  );

  return (
    <section className="page-in">
      <div className="eyebrow">{t("eyebrow")}</div>
      <div className="h1">{t("heading")}</div>
      <p className="lede">{t("lede")}</p>

      <EarlyWarningPanel
        forecasts={forecastRes.data ?? []}
        signals={signalRes.data ?? []}
        points={(forecastRes.data ?? []).flatMap((f) => { const v=(villageRes.data ?? []).find((x) => x.district===f.district && (x.taluka===f.block || x.name===f.block)); return v?.lat != null && v?.lng != null ? [{lat:v.lat as number,lng:v.lng as number,title:`${f.block}, ${f.district}`,level:f.risk_level,score:Number(f.risk_score)}] : []; })}
      />

      <AlertsClient
        initialAlerts={allAlerts}
        initialClusters={activeClusters}
        district={profile.district}
      />
    </section>
  );
}
