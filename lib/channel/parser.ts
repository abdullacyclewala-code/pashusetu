/**
 * PashuSetu · P7 — free-text / button parser for farmer-channel messages.
 *
 * Turns a raw WhatsApp (or IVR) message into the canonical report fields:
 * species, symptoms (canonical keys matching the disease KB), sick/dead counts
 * and location. Species + symptom synonyms are provided in English, Hindi and
 * Marathi so a low-literacy farmer typing in their own language is understood.
 *
 * The parser never throws — ambiguous input yields `unclear` tokens and the
 * ingest layer asks the farmer to clarify (interactive fallback). Free-text is
 * the "fast path"; the interactive button flow is the "guided path".
 */

import type { ReportDraft, ChannelLocale } from "./types";

/** Canonical species keys (must match lib/report/constants.ts + diseases.species). */
export const SPECIES_KEYS = [
  "cattle",
  "buffalo",
  "goat",
  "sheep",
  "pig",
  "poultry",
  "other",
] as const;
export type SpeciesKey = (typeof SPECIES_KEYS)[number];

const SPECIES_SYNONYMS: Record<string, string[]> = {
  cattle: [
    "cattle",
    "cow",
    "calf",
    "bull",
    "ox",
    "heifer",
    "गाय",
    "गाई",
    "कोंबडी", // (careful: also poultry) — kept last, low priority
    "बैल",
    "वासरू",
    "बछड़ा",
    "गो",
  ],
  buffalo: ["buffalo", "baffalo", "भैंस", "म्हैस", "म्हशी", "भैंसा", "पाड़ी"],
  goat: ["goat", "बकरी", "शेळी", "खिली", "बकरा"],
  sheep: ["sheep", "भेड़", "मेंढी", "मेंढा", "लैम्ब"],
  pig: ["pig", "swine", "hog", "सूअर", "डुकर", "सूवर"],
  poultry: [
    "poultry",
    "chicken",
    "hen",
    "rooster",
    "bird",
    "मुरगी",
    "मुर्गी",
    "मुर्गा",
    "कोंबडी",
    "कोंबडा",
    "पक्षी",
    "पक्ष्यां",
    "कोंबड्या",
  ],
};

const SYMPTOM_SYNONYMS: Record<string, string[]> = {
  fever: ["fever", "bukhar", "ताप", "ज्वर", "बुखार", "गरम", "गर्म", "तापमान", "तेज बुखार"],
  reduced_appetite: [
    "not eating",
    "no appetite",
    "won't eat",
    "refusing feed",
    "not eating food",
    "भूक",
    "खाना बंद",
    "चारा नहीं",
    "कम खा",
    "कम खाता",
    "उदासीन",
    "अन्न नाकारतो",
  ],
  weakness: ["weak", "weakness", "lazy", "lethargic", "कमजोर", "अशक्त", "दुर्बल", "कमजोरी", "अशक्तता"],
  milk_drop: [
    "milk drop",
    "less milk",
    "milk reduced",
    "little milk",
    "milk fell",
    "दूध कम",
    "दूध घट",
    "कम दूध",
    "दुग्ध कम",
    "दूध नाही",
  ],
  sudden_death: [
    "died",
    "died suddenly",
    "sudden death",
    "found dead",
    "sudden",
    "मृत्यु",
    "अचानक मृत्यू",
    "मेले",
    "मर गया",
    "मर गई",
    "मरण",
  ],
  mouth_blisters: [
    "mouth blister",
    "blister in mouth",
    "blisters in mouth",
    "mouth blisters",
    "मुंह में छाले",
    "मुख फोड",
    "तोंडात फोड",
    "छाले",
    "मुखात फोड",
  ],
  mouth_ulcers: ["mouth ulcer", "ulcer", "घाव मुंह", "मुख व्रण", "तोंडात जखम", "तोंड जखम"],
  drooling: ["drool", "drooling", "saliva", "salivation", "लार", "जास्त लार", "लार टपक", "थुक", "लाळ"],
  nasal_discharge: [
    "nasal discharge",
    "runny nose",
    "snot",
    "nose discharge",
    "नाक बह",
    "नाक स्राव",
    "नाकातून पाणी",
    "सर्दी",
    "नाकातून स्त्राव",
  ],
  difficulty_breathing: [
    "difficulty breathing",
    "hard breathing",
    "shortness of breath",
    "panting",
    "breathing trouble",
    "सांस",
    "श्वास",
    "दम",
    "छाती",
    "श्वास घेण्यास त्रास",
    "सांस लेने में दिक्कत",
  ],
  skin_nodules: ["nodule", "lumps on skin", "bumps on skin", "skin lump", "lumpy", "गांठ", "त्वचा गांठ", "गुठळी", "त्वचेवर गाठ", "गिल्टी"],
  skin_pox_lesions: ["pox", "lesion", "pimple", "skin sore", "चेचक", "मस्सा", "त्वचा फोड", "खरुज"],
  swollen_lymph_nodes: ["swollen lymph", "lymph node", "गिल्टी", "सूज ग्रंथि", "ग्रंथी सूज"],
  swelling: ["swelling", "swollen", "सूज", "सुज", "सोज", "सूजन", "व्रण"],
  throat_swelling: ["throat swelling", "throat", "गला", "घसा", "गळा", "गले में सूज"],
  lameness: ["lame", "lameness", "limping", "लंगड़ा", "लंगडा", "पांगळा", "खोडत", "लँगडेपणा"],
  foot_lesions: ["foot lesion", "feet sore", "hoof", "foot sore", "खुर", "पाय फोड", "खूर", "पाय जखम", "खुर घाव"],
  muscle_swelling: ["muscle swelling", "स्नायु सूज", "मांसपेशी सूज", "स्नायू सूज"],
  paralysis: ["paralysis", "paralysed", "paralyzed", "लकवा", "पक्षाघात", "अर्धांग", "आंशिक लकवा"],
  circling: ["circling", "going round", "round and round", "walking in circles", "गोल गोल", "चक्कर", "गोल फिर", "गोल गोल फिरतो"],
  convulsions: ["convulsion", "seizure", "fit", "fitting", "दौरा", "आक्षेप", "झटके", "झपकी", "आकडी"],
  behaviour_change: [
    "strange behaviour",
    "abnormal behaviour",
    "acting strange",
    "behaviour change",
    "अजीब हरकत",
    "विचित्र वर्तन",
    "वागणूक बदल",
    "अजीब व्यवहार",
  ],
  diarrhoea: ["diarrhoea", "diarrhea", "loose motion", "loose stool", "दस्त", "अतिसार", "जुलाब", "पातळ शेण", "पतला मल"],
  bloating: ["bloating", "bloated", "stomach swelling", "पेट फूल", "अपचन", "पोट सूज", "गोळा", "पेट फूलना"],
  red_urine: ["red urine", "blood in urine", "लाल मूत्र", "पेशाब लाल", "रक्तमूत्र", "लाल पेशाब"],
  udder_swelling: ["udder swelling", "swollen udder", "teat swelling", "थन सूज", "स्तन सूज", "थुन सुज", "कास सूज"],
  abnormal_milk: ["abnormal milk", "curdled milk", "blood in milk", "दूध असामान्य", "दूध रक्त", "दूध फाट", "दूधात रक्त"],
  abortion: ["abortion", "miscarriage", "aborted", "गर्भपात", "वाटणं सुट", "गर्भ सुट", "गर्भपात होना"],
  twisted_neck: ["twisted neck", "neck bent", "गला मुड़", "मान वाकडी", "गर्दन टेढ़ी", "टेढ़ी गर्दन"],
  drop_egg_production: ["egg drop", "less eggs", "no eggs", "egg production", "अंडे कम", "अंडा नहीं", "अंडी कम", "अंडी कमी"],
  respiratory_distress: [
    "respiratory distress",
    "gasping",
    "cough",
    "coughing",
    "खांसी",
    "कास",
    "श्वास तकलीफ",
    "सांस फूल",
    "खोकला",
  ],
};

/** Distinctive words used only to disambiguate Marathi vs Hindi when both present. */
const MR_MARKERS = ["आहे", "आणि", "म्हैस", "शेळी", "कोंबडी", "जनावर", "पशु", "तुमचे", "तुमच्या", "नाही", "घेऊ", "करू", "शकतो", "लाळ", "खुरकूत", "फोड"];
const HI_MARKERS = ["है", "और", "भैंस", "बकरी", "मुर्गी", "आप", "नहीं", "कर", "सकता", "दस्त", "मुँह", "लार"];

/** Lowercase a string without mangling Devanagari. */
function norm(s: string): string {
  return s.toLowerCase();
}

/** Detect the likely language of a message ('en' | 'hi' | 'mr'). */
export function detectLanguage(text: string, fallback: ChannelLocale = "en"): ChannelLocale {
  const hasDevanagari = /[\u0900-\u097F]/.test(text);
  if (!hasDevanagari) return /[a-z]/i.test(text) ? "en" : fallback;

  const mr = MR_MARKERS.filter((w) => norm(text).includes(norm(w))).length;
  const hi = HI_MARKERS.filter((w) => norm(text).includes(norm(w))).length;
  if (mr > hi) return "mr";
  if (hi > mr) return "hi";
  return fallback === "mr" ? "mr" : fallback === "hi" ? "hi" : "en";
}

/** Resolve the species mentioned in a message (first hit wins). */
export function detectSpecies(text: string): SpeciesKey | null {
  const lower = norm(text);
  for (const key of SPECIES_KEYS) {
    if (key === "other") continue;
    const syns = SPECIES_SYNONYMS[key] ?? [];
    for (const s of syns) {
      if (lower.includes(norm(s))) return key;
    }
  }
  return null;
}

/** Collect every canonical symptom key whose synonym appears in the text. */
export function detectSymptoms(text: string): string[] {
  const lower = norm(text);
  const found: string[] = [];
  for (const [key, syns] of Object.entries(SYMPTOM_SYNONYMS)) {
    for (const s of syns) {
      if (lower.includes(norm(s))) {
        found.push(key);
        break;
      }
    }
  }
  return found;
}

const SICK_WORDS = /sick|बीमार|आजारी|मरी|मरद|रुग्ण/i;
const DEAD_WORDS = /dead|died|मरा|मरे|मेले|मृत्यू|मरण|मर गय/i;

/** Extract sick/dead counts from patterns like "2 sick 1 dead" or "मरी 3, मेले 1". */
export function detectCounts(text: string): { sickCount: number; deadCount: number } {
  const numsAround = (wordRe: RegExp) => {
    const before = text.match(new RegExp(`(\\d+)\\s*(${wordRe.source})`, "i"));
    const after = text.match(new RegExp(`(${wordRe.source})\\s*(\\d+)`, "i"));
    if (before?.[1]) return parseInt(before[1], 10);
    if (after?.[2]) return parseInt(after[2], 10);
    return null;
  };

  const sickHit = numsAround(SICK_WORDS);
  const deadHit = numsAround(DEAD_WORDS);

  const sickCount = sickHit ?? 1;
  const deadCount = deadHit ?? 0;
  return { sickCount, deadCount };
}

/** A village row as exposed by the villages table. */
export interface VillageRow {
  name: string;
  taluka: string;
  district: string;
}

/** Find the first village whose name appears in the text (case-insensitive). */
export function detectVillage(text: string, villages: VillageRow[]): VillageRow | null {
  const lower = norm(text);
  for (const v of villages) {
    if (lower.includes(norm(v.name))) return v;
  }
  return null;
}

/** Parse a free-text message into a draft report. Never throws. */
export function parseFreeText(
  text: string,
  villages: VillageRow[] = []
): ReportDraft {
  const raw = (text ?? "").trim();
  const village = detectVillage(raw, villages);
  const { sickCount, deadCount } = detectCounts(raw);
  const symptoms = detectSymptoms(raw);
  const species = detectSpecies(raw);

  const unclear: string[] = [];
  // words we didn't recognise as species/symptom/location/count — surfaced back
  const recognised = new Set([
    ...Object.values(SPECIES_SYNONYMS).flat(),
    ...Object.values(SYMPTOM_SYNONYMS).flat(),
    ...(village ? [village.name] : []),
    "sick",
    "dead",
    "पशु",
    "जनावर",
    "मरी",
    "मरे",
  ]);
  const tokens = raw.split(/[\s,،;।.!]+/).filter((w) => w.length > 1);
  for (const t of tokens) {
    if (/^\d+$/.test(t)) continue;
    const lower = norm(t);
    if (!Array.from(recognised).some((r) => lower.includes(norm(r)) || norm(r).includes(lower))) {
      unclear.push(t);
    }
  }

  return {
    species,
    symptoms,
    sickCount,
    deadCount,
    village: village?.name ?? null,
    taluka: village?.taluka ?? null,
    district: village?.district ?? null,
    geoEwkt: null,
    freeText: raw || null,
    matchedVillage: village ? { name: village.name, taluka: village.taluka, district: village.district } : null,
    unclear,
  };
}

/** Rough check: does this text look like a disease report (has symptoms or species)? */
export function looksLikeReport(text: string): boolean {
  return detectSymptoms(text).length > 0 || detectSpecies(text) !== null;
}

/** The human-facing species name given a channel locale. */
export const SPECIES_LABEL: Record<string, Record<ChannelLocale, string>> = {
  cattle: { en: "Cattle", hi: "गाय", mr: "गाय" },
  buffalo: { en: "Buffalo", hi: "भैंस", mr: "म्हैस" },
  goat: { en: "Goat", hi: "बकरी", mr: "शेळी" },
  sheep: { en: "Sheep", hi: "भेड़", mr: "मेंढी" },
  pig: { en: "Pig", hi: "सूअर", mr: "डुकर" },
  poultry: { en: "Poultry", hi: "मुर्गी", mr: "कोंबडी" },
  other: { en: "Animal", hi: "जानवर", mr: "प्राणी" },
};
