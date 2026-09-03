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
  photo_url: string | null;
  free_text: string | null;
  animal_id: string | null;
  reporter_id: string | null;
  offline_ts: string | null;
  animals: { tag_id: string | null; breed: string | null } | null;
  reporter: { name: string | null; phone: string | null; village: string | null } | null;
  triage_results: TriageRow[];
  cases: { status: string }[];
}

/** Shared PostgREST select — the realtime refetch must match the SSR query. */
export const OFFICER_ROW_SELECT =
  "id, species, symptoms, sick_count, dead_count, village, taluka, district, status, created_at, lat, lng, photo_url, free_text, animal_id, reporter_id, offline_ts, " +
  "animals:animals!reports_animal_id_fkey(tag_id, breed), " +
  "reporter:profiles!reports_reporter_id_fkey(name, phone, village), " +
  "triage_results(disease_candidates, confidence, urgency, advisory_text, notifiable_flag, source, created_at), " +
  "cases(status)";

export interface OfficerKpis {
  reports24h: number;
  openCases: number;
  clusters: number;
  medianTriageMin: number | null;
}
