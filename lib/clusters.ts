import type { ClusterRow } from "@/lib/alerts/types";

/** Severity → case count, matching the officer dashboard's warm palette. */
export function clusterColor(severity: string | null): string {
  switch (severity) {
    case "critical":
      return "#A8431F";
    case "confirmed":
      return "#7A8C51";
    case "warning":
    default:
      return "#B98523";
  }
}

/** Localised disease display name for a cluster (from the embed / guess). */
export function clusterDiseaseName(
  c: ClusterRow,
  locale: string
): string {
  const d = c.diseases;
  if (!d) return c.disease_guess ?? "—";
  if (locale === "hi" && d.name_hi) return d.name_hi;
  if (locale === "mr" && d.name_mr) return d.name_mr;
  return d.name_en;
}

/** A cluster appears "new" if it was raised in the last 15 min (realtime flow). */
export function isNewCluster(c: ClusterRow, now: number): boolean {
  if (!c.created_at) return false;
  return now - new Date(c.created_at).getTime() < 15 * 60 * 1000;
}
