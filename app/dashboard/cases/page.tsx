import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/data/session";
import { OfficerClient } from "./OfficerClient";
import {
  OFFICER_ROW_SELECT,
  type OfficerReportRow,
} from "@/lib/officer/types";
import type { ClusterRow } from "@/lib/alerts/types";

const CLUSTER_SELECT =
  "id, disease_guess, case_count, radius_km, district, village, severity, status, first_seen, last_seen, created_at, lat, lng, " +
  "diseases:clusters_disease_guess_fkey(code, name_en, name_hi, name_mr)";

/**
 * P3 — Officer command centre: district map + KPIs + live case queue.
 * RLS scopes every query to the officer's district (my_district()), so
 * nothing here filters by district manually — the database enforces it.
 */
export default async function CasesPage() {
  const t = await getTranslations("cases");
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");
  if (!["vet", "officer", "lab", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [reportsRes, dayRes, openRes, clusterRes, clusterListRes] =
    await Promise.all([
      supabase
        .from("reports")
        .select(OFFICER_ROW_SELECT)
        .order("created_at", { ascending: false })
        .limit(120)
        .returns<OfficerReportRow[]>(),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
      supabase
        .from("cases")
        .select("id", { count: "exact", head: true })
        .in("status", ["suspected", "confirmed"]),
      supabase
        .from("clusters")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("clusters")
        .select(CLUSTER_SELECT)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10)
        .returns<ClusterRow[]>(),
    ]);

  const rows = reportsRes.data ?? [];

  // median report → triage-result latency, in minutes
  const lags = rows
    .map((r) => {
      const tr = r.triage_results[0];
      if (!tr?.created_at) return null;
      return (
        (new Date(tr.created_at).getTime() -
          new Date(r.created_at).getTime()) /
        60000
      );
    })
    .filter((m): m is number => m !== null && m >= 0 && m < 24 * 60)
    .sort((a, b) => a - b);
  const medianTriageMin = lags.length
    ? Math.round(lags[Math.floor(lags.length / 2)] * 10) / 10
    : null;

  return (
    <section className="page-in">
      <div className="eyebrow">{t("eyebrow")}</div>
      <div className="h1">{t("heading")}</div>
      <p className="lede">
        {t("lede", { district: profile.district ?? "—" })}
      </p>

      <OfficerClient
        initialRows={rows}
        initialClusters={clusterListRes.data ?? []}
        kpis={{
          reports24h: dayRes.count ?? 0,
          openCases: openRes.count ?? 0,
          clusters: clusterRes.count ?? 0,
          medianTriageMin,
        }}
        canDecide={["vet", "officer", "admin"].includes(profile.role)}
      />
    </section>
  );
}
