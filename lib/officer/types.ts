import type { TriageRow } from "@/lib/triage/types";

/** A single chain-of-custody entry on a lab sample. */
export interface CustodyEntry {
  at: string;
  by: string;
  role: string;
  action: string;
  status: string;
}

/** A lab sample attached to a case (0006). */
export interface SampleRow {
  id: string;
  case_id: string;
  barcode: string | null;
  lab_id: string | null;
  result: string | null;
  result_summary: string | null;
  status: string;
  specimen_type: string | null;
  disease_code: string | null;
  collected_at: string | null;
  received_at: string | null;
  resulted_at: string | null;
  notes: string | null;
  custody_json: CustodyEntry[] | null;
  created_at: string;
}

/** An immutable audit-trail event on a case (0006). */
export interface CaseEventRow {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
}

/** A veterinarian available for assignment. */
export interface VetRow {
  id: string;
  name: string;
  phone: string | null;
  district: string | null;
  taluka: string | null;
}

/** The case arc (confirmed → contained → closed) plus lab + audit trail. */
export interface OfficerCase {
  id: string;
  report_id: string;
  status: string;
  disease_code: string | null;
  severity: string | null;
  district: string | null;
  assigned_vet_id: string | null;
  escalated_at: string | null;
  contained_at: string | null;
  closed_at: string | null;
  notes: string | null;
  updated_at: string;
  vet: VetRow | null;
  samples: SampleRow[];
  case_events: CaseEventRow[];
}

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
  cases: OfficerCase[];
}

/** Shared PostgREST select — the realtime refetch must match the SSR query. */
export const OFFICER_ROW_SELECT =
  "id, species, symptoms, sick_count, dead_count, village, taluka, district, status, created_at, lat, lng, photo_url, free_text, animal_id, reporter_id, offline_ts, " +
  "animals:animals!reports_animal_id_fkey(tag_id, breed), " +
  "reporter:profiles!reports_reporter_id_fkey(name, phone, village), " +
  "triage_results(disease_candidates, confidence, urgency, advisory_text, notifiable_flag, source, created_at), " +
  "cases(id, report_id, status, disease_code, severity, district, assigned_vet_id, escalated_at, contained_at, closed_at, notes, updated_at, " +
  "vet:vets!cases_assigned_vet_id_fkey(id, name, phone, district, taluka), " +
  "samples(id, case_id, barcode, lab_id, result, result_summary, status, specimen_type, disease_code, collected_at, received_at, resulted_at, notes, custody_json, created_at), " +
  "case_events(id, event_type, from_status, to_status, note, created_at))";

export interface OfficerKpis {
  reports24h: number;
  openCases: number;
  clusters: number;
  medianTriageMin: number | null;
}

/** Vaccine codes + localized label keys used by the herd coverage view. */
export const CORE_VACCINES = ["FMD", "LSD", "HS", "PPR"];

/** Localised disease display names keyed by disease code (falls back to the code). */
const DISEASE_NAMES: Record<string, { en: string; hi: string; mr: string }> = {
  AI: { en: "Avian Influenza (Bird Flu)", hi: "बर्ड फ्लू", mr: "बर्ड फ्लू" },
  ANTH: { en: "Anthrax", hi: "गिल्टी रोग", mr: "फाशी रोग" },
  BABES: { en: "Babesiosis", hi: "बबेसियोसिस", mr: "बॅबेसिओसिस" },
  BQ: { en: "Black Quarter", hi: "लंगड़ी बुखार", mr: "फऱ्या" },
  BRUC: { en: "Brucellosis", hi: "ब्रुसेलोसिस", mr: "ब्रुसेलोसिस" },
  BTV: { en: "Bluetongue", hi: "ब्लूटंग", mr: "निळी जीभ" },
  CSF: { en: "Classical Swine Fever", hi: "सूअर ज्वर", mr: "स्वाइन फिव्हर" },
  ET: { en: "Enterotoxaemia", hi: "एंटरोटॉक्सीमिया", mr: "आंत्रविषार" },
  FMD: { en: "Foot and Mouth Disease", hi: "खुरपका-मुंहपका रोग", mr: "लाळ्या खुरकूत" },
  GOATPOX: { en: "Goat Pox", hi: "बकरी चेचक", mr: "देवी (शेळी)" },
  HS: { en: "Haemorrhagic Septicaemia", hi: "गलघोंटू", mr: "घटसर्प" },
  LSD: { en: "Lumpy Skin Disease", hi: "लम्पी त्वचा रोग", mr: "लम्पी त्वचा रोग" },
  MAST: { en: "Mastitis", hi: "थनैला रोग", mr: "कासदाह (स्तनदाह)" },
  ND: { en: "Newcastle Disease (Ranikhet)", hi: "रानीखेत रोग", mr: "राणीखेत रोग" },
  PPR: { en: "Peste des Petits Ruminants", hi: "पीपीआर (बकरी प्लेग)", mr: "पीपीआर (शेळी प्लेग)" },
  RABIES: { en: "Rabies", hi: "रेबीज", mr: "रेबीज" },
  THEIL: { en: "Theileriosis", hi: "थिलेरियोसिस", mr: "थायलेरिओसिस" },
  TRYP: { en: "Trypanosomiasis (Surra)", hi: "सर्रा रोग", mr: "सर्रा" },
};

/** Localised disease name for a code (used on cases/samples that store code). */
export function diseaseName(code: string | null | undefined, locale: string): string {
  if (!code) return "—";
  const d = DISEASE_NAMES[code];
  if (!d) return code;
  if (locale === "hi" && d.hi) return d.hi;
  if (locale === "mr" && d.mr) return d.mr;
  return d.en;
}
