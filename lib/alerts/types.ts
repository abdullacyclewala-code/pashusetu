/** Shared client types for Part 5 — alerts + outbreak clusters. */

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertRow {
  id: string;
  severity: AlertSeverity;
  audience: string;
  district: string | null;
  channel: string;
  read: boolean;
  created_at: string;
  message_json: AlertMessage;
}

export interface AlertMessage {
  cluster_id?: string;
  disease?: string;
  disease_name_en?: string;
  disease_name_hi?: string | null;
  disease_name_mr?: string | null;
  case_count?: number;
  district?: string | null;
  village?: string | null;
  radius_km?: number | null;
  en?: string;
  hi?: string;
  mr?: string;
}

export type ClusterStatus = "active" | "resolved" | "confirmed";

export interface ClusterRow {
  id: string;
  disease_guess: string | null;
  case_count: number;
  radius_km: number | null;
  district: string | null;
  village: string | null;
  severity: string;
  status: ClusterStatus;
  first_seen: string | null;
  last_seen: string | null;
  created_at: string;
  /** PostGIS computed columns (0005) */
  lat: number | null;
  lng: number | null;
  /** PostgREST embed: clusters.disease_guess → diseases.code */
  diseases: { code: string; name_en: string; name_hi: string | null; name_mr: string | null } | null;
}
