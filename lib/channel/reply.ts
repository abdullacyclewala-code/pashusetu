/**
 * PashuSetu · P7 — builds the farmer-facing reply (WhatsApp/IVR) from a triage
 * result, fully localised (en/hi/mr) and ALWAYS carrying the mandatory
 * "preliminary triage, not a diagnosis — consult a vet" disclaimer.
 *
 * These builders are pure and isomorphic so the webhook, the simulator and any
 * future IVR/TTS handler can share them. No next-intl request context needed.
 */

import type { ChannelLocale } from "./types";
import type { Candidate, Urgency } from "@/lib/triage/types";
import { diseaseAdvice } from "@/lib/advisory";
import { diseaseName } from "@/lib/officer/types";

const DISCLAIMER: Record<ChannelLocale, string> = {
  en: "This is preliminary triage, not a diagnosis. Please consult a veterinarian.",
  hi: "यह प्रारंभिक आकलन है, निदान नहीं। कृपया पशु चिकित्सक से सलाह लें।",
  mr: "हे प्राथमिक मूल्यांकन आहे, निदान नाही. कृपया पशुवैद्यकाचा सल्ला घ्या.",
};

const URGENCY: Record<Urgency, Record<ChannelLocale, string>> = {
  low: { en: "Low concern", hi: "कम चिंता", mr: "कमी चिंता" },
  medium: { en: "Moderate concern", hi: "मध्यम चिंता", mr: "मध्यम चिंता" },
  high: { en: "High concern", hi: "उच्च चिंता", mr: "उच्च चिंता" },
  critical: { en: "Critical — act now", hi: "गंभीर — तुरंत कार्रवाई", mr: "गंभीर — त्वरित कार्य" },
};

const NOTIFIABLE: Record<ChannelLocale, string> = {
  en: "This is a notifiable disease. The district veterinary officer has been alerted.",
  hi: "यह अधिसूचित रोग है। जिला पशु चिकित्सा अधिकारी को सूचित किया गया है।",
  mr: "हे अधिसूचित आजार आहे. जिल्हा पशुवैद्यकीय अधिकाऱ्याला कळवले गेले आहे.",
};

const HELP: Record<ChannelLocale, string> = {
  en: 'To report a sick animal, type: species, symptoms and counts. Example: "Cattle fever mouth blisters drooling 2 sick 1 dead Shirur". Or use the buttons below.',
  hi: 'बीमार जानवर की रिपोर्ट के लिए लिखें: प्रकार, लक्षण और संख्या। उदाहरण: "भैंस ताप मुंह में छाले लार 2 बीमार 1 मरा Shirur"। या नीचे दिए बटन दबाएं।',
  mr: 'आजारी जनावराची तक्रार नोंदवण्यासाठी लिहा: प्रकार, लक्षणे आणि संख्या. उदाहरण: "गाय ताप तोंडात फोड लाळ 2 आजारी 1 मेले Shirur". किंवा खालील बटणे दाबा.',
};

const confirmPrefix: Record<ChannelLocale, string> = {
  en: "Your report has been received.",
  hi: "आपकी रिपोर्ट प्राप्त हो गई है।",
  mr: "तुमची तक्रार नोंदवली गेली आहे.",
};

const officerNote: Record<ChannelLocale, string> = {
  en: "The district veterinary officer has been alerted and will follow up.",
  hi: "जिला पशु चिकित्सा अधिकारी को सूचित किया गया है और वे अनुसरण करेंगे।",
  mr: "जिल्हा पशुवैद्यकीय अधिकाऱ्याला कळवले आहे आणि ते पाठपुरावा करतील.",
};

const SYMPTOM_LABEL: Record<string, Record<ChannelLocale, string>> = {
  fever: { en: "Fever", hi: "बुखार", mr: "ताप" },
  reduced_appetite: { en: "Reduced appetite", hi: "भूख कम", mr: "भूक कमी" },
  weakness: { en: "Weakness", hi: "कमजोरी", mr: "अशक्तपणा" },
  milk_drop: { en: "Milk drop", hi: "दूध कम", mr: "दूध कमी" },
  sudden_death: { en: "Sudden death", hi: "अचानक मृत्यु", mr: "अचानक मृत्यू" },
  mouth_blisters: { en: "Mouth blisters", hi: "मुंह में छाले", mr: "तोंडात फोड" },
  mouth_ulcers: { en: "Mouth ulcers", hi: "मुंह के घाव", mr: "तोंडात जखम" },
  drooling: { en: "Drooling", hi: "लार", mr: "लाळ" },
  nasal_discharge: { en: "Nasal discharge", hi: "नाक बहना", mr: "नाकातून स्त्राव" },
  difficulty_breathing: { en: "Difficulty breathing", hi: "सांस की तकलीफ", mr: "श्वास घेण्यास त्रास" },
  skin_nodules: { en: "Skin nodules", hi: "त्वचा पर गांठ", mr: "त्वचेवर गाठ" },
  skin_pox_lesions: { en: "Skin lesions", hi: "त्वचा घाव", mr: "त्वचा फोड" },
  swollen_lymph_nodes: { en: "Swollen lymph nodes", hi: "ग्रंथि सूज", mr: "ग्रंथी सूज" },
  swelling: { en: "Swelling", hi: "सूजन", mr: "सूज" },
  throat_swelling: { en: "Throat swelling", hi: "गले में सूज", mr: "गळ्यात सूज" },
  lameness: { en: "Lameness", hi: "लंगड़ापन", mr: "लंगडेपणा" },
  foot_lesions: { en: "Foot lesions", hi: "पैर में घाव", mr: "पायात जखम" },
  muscle_swelling: { en: "Muscle swelling", hi: "मांसपेशी सूज", mr: "स्नायू सूज" },
  paralysis: { en: "Paralysis", hi: "लकवा", mr: "अर्धांग" },
  circling: { en: "Circling", hi: "गोल घूमना", mr: "गोल फिरणे" },
  convulsions: { en: "Convulsions", hi: "दौरे", mr: "झटके" },
  behaviour_change: { en: "Behaviour change", hi: "व्यवहार बदल", mr: "वर्तन बदल" },
  diarrhoea: { en: "Diarrhoea", hi: "दस्त", mr: "जुलाब" },
  bloating: { en: "Bloating", hi: "पेट फूलना", mr: "पोट सूज" },
  red_urine: { en: "Red/bloody urine", hi: "लाल पेशाब", mr: "लाल मूत्र" },
  udder_swelling: { en: "Udder swelling", hi: "थन सूज", mr: "कास सूज" },
  abnormal_milk: { en: "Abnormal milk", hi: "असामान्य दूध", mr: "असामान्य दूध" },
  abortion: { en: "Abortion", hi: "गर्भपात", mr: "गर्भपात" },
  twisted_neck: { en: "Twisted neck", hi: "टेढ़ी गर्दन", mr: "मान वाकडी" },
  drop_egg_production: { en: "Egg drop", hi: "अंडे कम", mr: "अंडी कमी" },
  respiratory_distress: { en: "Respiratory distress", hi: "सांस तकलीफ", mr: "श्वास तकलीफ" },
};

function symptomLbl(code: string, locale: ChannelLocale): string {
  return SYMPTOM_LABEL[code]?.[locale] ?? code.replace(/_/g, " ");
}

/** Best-disease line (name + confidence) localised to the farmer's language. */
function topLine(cands: Candidate[] | null, locale: ChannelLocale): string {
  const top = cands?.[0];
  if (!top) return "";
  const pct = Math.round(top.confidence * 100);
  return `${diseaseName(top.code, locale)} (${pct}%)`;
}

/** Build the post-report advisory reply. */
export function buildReportReply(
  locale: ChannelLocale,
  args: {
    species: string | null;
    symptoms: string[];
    sickCount: number;
    deadCount: number;
    candidates: Candidate[] | null;
    urgency: Urgency | null;
    notifiable: boolean;
  }
): string {
  const L = confirmPrefix[locale];
  const top = topLine(args.candidates ?? null, locale);
  const syn = args.symptoms.map((s) => symptomLbl(s, locale)).join(", ");

  const lines: string[] = [];
  lines.push(L);
  if (args.species) lines.push(`${args.species} · ${args.sickCount} sick${args.deadCount ? ` · ${args.deadCount} dead` : ""}`);
  if (top) lines.push(`Suspected: ${top}`);
  if (syn) lines.push(`Signs: ${syn}`);
  if (args.urgency) lines.push(`Urgency: ${URGENCY[args.urgency]?.[locale] ?? args.urgency}`);

  // disease-specific first-aid
  const code = args.candidates?.[0]?.code;
  if (code) lines.push(diseaseAdvice(code, locale));

  if (args.notifiable) lines.push(NOTIFIABLE[locale]);
  else lines.push(officerNote[locale]);

  lines.push(DISCLAIMER[locale]);
  return lines.join("\n");
}

/** Greeting / help when a farmer first messages (or sends a bare hello). */
export function buildHelp(locale: ChannelLocale): string {
  return `${HELP[locale]}\n${DISCLAIMER[locale]}`;
}

/** Ask the farmer for the next missing field during an interactive flow. */
export function buildClarify(locale: ChannelLocale, step: string, clearer?: string[]): string {
  const asks: Record<string, Record<ChannelLocale, string>> = {
    species: { en: "Which animal? Reply Cattle, Buffalo, Goat, Sheep, Pig or Poultry.", hi: "कौन सा जानवर? गाय, भैंस, बकरी, भेड़, सूअर या मुर्गी लिखें।", mr: "कोणता प्राणी? गाय, म्हैस, शेळी, मेंढी, डुकर किंवा कोंबडी लिहा." },
    symptoms: { en: "What are the signs? Reply separated by commas, e.g. fever, mouth blisters, drooling.", hi: "क्या लक्षण हैं? कॉमा से अलग करके लिखें, जैसे बुखार, मुंह में छाले, लार।", mr: "काय लक्षणे? स्वल्पविरामाने लिहा, उदा. ताप, तोंडात फोड, लाळ." },
    counts: { en: "How many are sick and how many have died? E.g. 2 sick 1 dead.", hi: "कितने बीमार हैं और कितने मरे? जैसे 2 बीमार 1 मरा।", mr: "किती आजारी आणि किती मेले? उदा. 2 आजारी 1 मेले." },
    location: { en: "Which village? Or tap to share your location.", hi: "कौन सा गांव? या अपनी लोकेशन भेजें।", mr: "कोणते गाव? किंवा तुमचे स्थान पाठवा." },
  };
  let msg = asks[step]?.[locale] ?? asks.symptoms[locale];
  if (clearer && clearer.length) {
    const c = clearer.slice(0, 3).join(", ");
    msg += `\n(Didn't understand: ${c})`;
  }
  return msg;
}

/** A plain confirmation that the report was created (used when triage is still running). */
export const CONFIRMED: Record<ChannelLocale, string> = confirmPrefix;
