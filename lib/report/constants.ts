/**
 * Canonical species + symptom keys.
 * Symptom keys MUST match supabase/seed.sql diseases.symptoms — the Part 2
 * triage rule engine joins on these exact strings.
 * Labels are translated via messages/*.json (species.* / symptoms.*).
 */

export const SPECIES = [
  { key: "cattle" },
  { key: "buffalo" },
  { key: "goat" },
  { key: "sheep" },
  { key: "pig" },
  { key: "poultry" },
  { key: "other" },
] as const;

export type SpeciesKey = (typeof SPECIES)[number]["key"];

export const SYMPTOM_GROUPS: { group: string; keys: string[] }[] = [
  {
    group: "general",
    keys: ["fever", "reduced_appetite", "weakness", "milk_drop", "sudden_death"],
  },
  {
    group: "mouth_nose",
    keys: [
      "mouth_blisters",
      "mouth_ulcers",
      "drooling",
      "nasal_discharge",
      "difficulty_breathing",
    ],
  },
  {
    group: "skin_body",
    keys: [
      "skin_nodules",
      "skin_pox_lesions",
      "swollen_lymph_nodes",
      "swelling",
      "throat_swelling",
    ],
  },
  {
    group: "movement_nervous",
    keys: [
      "lameness",
      "foot_lesions",
      "muscle_swelling",
      "paralysis",
      "circling",
      "convulsions",
      "behaviour_change",
    ],
  },
  {
    group: "digestive",
    keys: ["diarrhoea", "bloating", "red_urine"],
  },
  {
    group: "udder_repro",
    keys: ["udder_swelling", "abnormal_milk", "abortion"],
  },
  {
    group: "poultry_signs",
    keys: ["twisted_neck", "drop_egg_production", "respiratory_distress"],
  },
];

export const ALL_SYMPTOM_KEYS = SYMPTOM_GROUPS.flatMap((g) => g.keys);
