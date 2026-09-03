import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/data/session";
import { AlertsClient } from "./AlertsClient";
import type { AlertRow, ClusterRow } from "@/lib/alerts/types";

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

  const [alertsRes, clustersRes] = await Promise.all([
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

      <AlertsClient
        initialAlerts={allAlerts}
        initialClusters={activeClusters}
        district={profile.district}
      />
    </section>
  );
}
