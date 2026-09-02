import type { TriageRow } from "@/lib/triage/types";

/** One row of the officer case queue (report + latest triage + decision). */
export interface OfficerReportRow {
  id: string;
  species: string;
  symptoms: string[];
  sick_count: number;
  dead_count: number;
  village: string | null;
  taluka: string | null;
  district: string | null;
  status: string;
  created_at: string;
  /** PostGIS computed columns (0004) — null when the farmer skipped GPS. */
  lat: number | null;
  lng: number | null;
  triage_results: TriageRow[];
  cases: { status: string }[];
}

/** Shared PostgREST select — the realtime refetch must match the SSR query. */
export const OFFICER_ROW_SELECT =
  "id, species, symptoms, sick_count, dead_count, village, taluka, district, status, created_at, lat, lng, " +
  "triage_results(disease_candidates, confidence, urgency, advisory_text, notifiable_flag, source, created_at), " +
  "cases(status)";

export interface OfficerKpis {
  reports24h: number;
  openCases: number;
  clusters: number;
  medianTriageMin: number | null;
}
