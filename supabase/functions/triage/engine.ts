/**
 * PashuSetu explainable triage engine (Anchor C) — pure function, no IO.
 *
 * Bayesian-style differential:
 *   P(disease | symptoms, species, season, district)
 *     ∝ P(symptoms | disease) × prevalence prior
 *
 *   P(symptoms|disease) proxy = weighted symptom coverage (hallmark signs
 *     count double) blended with precision (how many reported signs the
 *     disease actually explains).
 *   Prior = season multiplier (from ICAR/FAO seasonality) × nearby-cases
 *     multiplier (recent similar triaged reports in the same district —
 *     the officer-confirm flywheel strengthens this over time).
 *
 * Every candidate carries matched + missed signs and machine-readable
 * reasons so the UI can always show WHY. Never a black box.
 */

export interface DiseaseRow {
  code: string;
  name_en: string;
  name_hi: string | null;
  name_mr: string | null;
  species: string[];
  symptoms: string[];
  zoonotic: boolean;
  notifiable: boolean;
  seasonality: string | null;
}

export interface TriageInput {
  species: string;
  symptoms: string[];
  sickCount: number;
  deadCount: number;
  month: number; // 1–12, from capture time
  /** disease code → similar triaged reports in this district, last 14 days */
  nearbyCounts: Record<string, number>;
}

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
  confidence: number; // 0–1 share among candidates, quality-capped
  matched: string[];
  missed: string[];
  reasons: Reason[];
  zoonotic: boolean;
  notifiable: boolean;
}

export type Urgency = "low" | "medium" | "high" | "critical";

export interface TriageResult {
  candidates: Candidate[];
  confidence: number;
  urgency: Urgency;
  notifiable: boolean;
}

const HALLMARK_COUNT = 2; // first N symptoms in the KB row are hallmark signs
const HALLMARK_WEIGHT = 2;

export function season(month: number): string {
  if (month >= 3 && month <= 5) return "summer";
  if (month >= 6 && month <= 9) return "monsoon";
  if (month >= 10 && month <= 11) return "post_monsoon";
  return "winter";
}

function inSeason(seasonality: string | null, s: string): boolean {
  if (!seasonality || seasonality.includes("year_round")) return true;
  return seasonality.includes(s);
}

export function runTriage(input: TriageInput, kb: DiseaseRow[]): TriageResult {
  const reported = new Set(input.symptoms);
  const currentSeason = season(input.month);

  const scored: Candidate[] = [];

  for (const d of kb) {
    // species filter ("other" species considers every disease)
    if (input.species !== "other" && !d.species.includes(input.species)) {
      continue;
    }

    const weightOf = (sym: string) =>
      d.symptoms.indexOf(sym) < HALLMARK_COUNT ? HALLMARK_WEIGHT : 1;

    const matched = d.symptoms.filter((s) => reported.has(s));
    if (matched.length === 0) continue;

    const matchedWeight = matched.reduce((sum, s) => sum + weightOf(s), 0);
    const totalWeight = d.symptoms.reduce((sum, s) => sum + weightOf(s), 0);
    const coverage = matchedWeight / totalWeight;

    // how much of what was reported does this disease explain?
    const knownReported = input.symptoms.filter((s) =>
      kb.some((k) => k.symptoms.includes(s))
    );
    const precision =
      knownReported.length > 0 ? matched.length / knownReported.length : 0;

    const likelihood = coverage * 0.7 + precision * 0.3;

    // priors
    const seasonal = inSeason(d.seasonality, currentSeason);
    const nearby = input.nearbyCounts[d.code] ?? 0;
    const prior = (seasonal ? 1.25 : 0.8) * (1 + Math.min(nearby, 5) * 0.08);

    const score = likelihood * prior;

    const hallmarksMatched = matched.filter(
      (s) => d.symptoms.indexOf(s) < HALLMARK_COUNT
    );
    const missed = d.symptoms.filter((s) => !reported.has(s)).slice(0, 4);

    const reasons: Reason[] = [
      { key: "symptom_match", matched: matched.length, total: d.symptoms.length },
      ...hallmarksMatched.map((s): Reason => ({ key: "hallmark", symptom: s })),
      ...(seasonal && d.seasonality && !d.seasonality.includes("year_round")
        ? [{ key: "season" } as Reason]
        : []),
      ...(nearby > 0 ? [{ key: "nearby", count: nearby } as Reason] : []),
      ...(d.zoonotic ? [{ key: "zoonotic" } as Reason] : []),
      ...(d.notifiable ? [{ key: "notifiable" } as Reason] : []),
    ];

    scored.push({
      code: d.code,
      name_en: d.name_en,
      name_hi: d.name_hi,
      name_mr: d.name_mr,
      score,
      confidence: 0, // filled after normalisation
      matched,
      missed,
      reasons,
      zoonotic: d.zoonotic,
      notifiable: d.notifiable,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  // Confidence = blend of absolute evidence strength (how well the signs
  // fit this disease) and relative share among rivals, with a smoothing
  // mass so weak evidence never inflates, hard-capped by match count.
  const total = top.reduce((sum, c) => sum + c.score, 0) + 0.35;
  for (const c of top) {
    const relative = c.score / total;
    const absolute = Math.min(1, c.score / 1.25); // score ≈ likelihood × prior
    const raw = 0.55 * relative + 0.45 * absolute;
    const cap =
      c.matched.length <= 1 ? 0.45 : c.matched.length === 2 ? 0.7 : 0.9;
    c.confidence = Math.round(Math.min(raw, cap) * 100) / 100;
  }

  const best = top[0];
  const confidence = best?.confidence ?? 0;

  let urgency: Urgency;
  if (!best || confidence < 0.25) {
    urgency = input.deadCount > 0 ? "high" : "low";
  } else if (best.notifiable && (input.deadCount > 0 || confidence >= 0.55)) {
    urgency = "critical";
  } else if (input.deadCount > 0) {
    urgency = "high";
  } else if ((best.notifiable || best.zoonotic) && confidence >= 0.4) {
    // dangerous disease but weak evidence (< 0.4, e.g. only generic
    // signs like fever) stays "medium" — the advisory still carries the
    // notifiable warning; escalation needs deaths or a stronger match.
    urgency = "high";
  } else {
    urgency = "medium";
  }

  return {
    candidates: top,
    confidence,
    urgency,
    notifiable: best?.notifiable ?? false,
  };
}

/** English advisory (P4 swaps in Bhashini-translated versions). */
export function buildAdvisory(result: TriageResult): string {
  const best = result.candidates[0];
  const lines: string[] = [];

  if (best) {
    lines.push(
      `Suspected: ${best.name_en} (confidence ${(best.confidence * 100).toFixed(0)}%).`
    );
  } else {
    lines.push(
      "The reported signs did not clearly match a known disease pattern."
    );
  }

  lines.push("Isolate sick animals from the rest of the herd immediately.");
  lines.push("Provide clean water, shade and soft feed; avoid stress.");
  lines.push("Do not move, sell or share equipment from affected animals.");

  if (best?.zoonotic) {
    lines.push(
      "This disease can spread to humans — wear gloves, wash hands, and do not consume raw milk from affected animals."
    );
  }
  if (best?.notifiable) {
    lines.push(
      "This is a notifiable disease — inform your local veterinary officer or call the 1962 helpline immediately."
    );
  } else {
    lines.push("Contact your nearest veterinarian or call the 1962 helpline.");
  }

  lines.push(
    "This is preliminary triage, not a diagnosis — always consult a veterinarian."
  );
  return lines.join("\n");
}
