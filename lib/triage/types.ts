/**
 * Shared client-side types for triage results — mirrors the shapes produced
 * by supabase/functions/triage/engine.ts (kept in sync manually; the edge
 * function is the source of truth).
 */

export type Urgency = "low" | "medium" | "high" | "critical";

export type Reason =
  | { key: "symptom_match"; matched: number; total: number }
  | { key: "hallmark"; symptom: string }
  | { key: "season" }
  | { key: "nearby"; count: number }
  | { key: "zoonotic" }
  | { key: "notifiable" };

export interface Candidate {
  code: string;
  name_en: string;
  name_hi: string | null;
  name_mr: string | null;
  score: number;
  confidence: number;
  matched: string[];
  missed: string[];
  reasons: Reason[];
  zoonotic: boolean;
  notifiable: boolean;
}

export interface TriageRow {
  disease_candidates: Candidate[];
  confidence: number | null;
  urgency: Urgency;
  advisory_text: string | null;
  notifiable_flag: boolean;
  source: string;
  created_at?: string;
}
