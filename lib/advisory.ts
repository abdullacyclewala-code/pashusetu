/**
 * Localised advisory library, keyed by disease code.
 *
 * The rule engine (supabase/functions/triage) produces a generic, English
 * advisory for storage (CSV/back-compat). This module adds *disease-specific*
 * first-aid guidance in all three app languages so the on-screen advisory is
 * both localised and useful. It is isomorphic (no Node/Next deps) so it can be
 * reused by the client, by a server action for P5/P8 alerts, or by a future
 * WhatsApp/IVR message builder.
 */

export interface LocalizedText {
  en: string;
  hi: string;
  mr: string;
}

/** Fallback guidance shown when a disease has no curated entry. */
const GENERIC: LocalizedText = {
  en: "Ask your veterinarian about vaccination and treatment for the suspected disease.",
  hi: "संदिग्ध बीमारी के लिए टीकाकरण और उपचार के बारे में अपने पशु चिकित्सक से पूछें।",
  mr: "संशयित आजारासाठी लसीकरण आणि उपचारांबद्दल तुमच्या पशुवैद्यकाला विचारा.",
};

export const DISEASE_ADVICE: Record<string, LocalizedText> = {
  FMD: {
    en: "Keep the animal's feet clean and dry; apply a mild antiseptic to blisters and mouth sores. Give extra care to every animal in the shed.",
    hi: "पैर साफ़ और सूखे रखें; छालों और मुंह के घावों पर हल्का एंटीसेप्टिक लगाएं। पूरे पशुशाला के जानवरों की अतिरिक्त देखभाल करें।",
    mr: "पाय स्वच्छ आणि कोरडे ठेवा; फोडे आणि तोंडाच्या जखमांवर हलके अँटिसेप्टिक लावा. शेडमधील सर्व जनावरांची जास्तीची काळजी घ्या.",
  },
  LSD: {
    en: "Apply a fly repellent and keep the shed cool and shaded. Do not let the animal share water or feed with others until it recovers.",
    hi: "मक्खी-भगाने वाला दवा लगाएं और पशुशाला ठंडी व छायादार रखें। ठीक होने तक पानी-चारा दूसरों के साथ साझा न करें।",
    mr: "माशा पळवणारे औषध लावा आणि शेड थंड आणि सावलीत ठेवा. बरे होईपर्यंत पाणी-चारा इतरांसोबत सामायिक करू नका.",
  },
  ANTH: {
    en: "Do NOT touch or cut the carcass — Anthrax spreads through blood and fluids. Seal the area and call the local veterinary officer immediately.",
    hi: "मृत जानवर को न छुएं और न काटें — एंथ्रेक्स खून-तरल से फैलता है। क्षेत्र को सील कर तुरंत स्थानीय पशु चिकित्सा अधिकारी को बुलाएं।",
    mr: "मेले जनावराला स्पर्श करू नका किंवा कापू नका — अँथ्रॅक्स रक्त व द्रवांतून पसरतो. परिसर सील करा व त्वरित स्थानिक पशुवैद्यकीय अधिकाऱ्याला बोलवा.",
  },
  MAST: {
    en: "Gently milk out the affected teat, apply a warm compress and keep the udder clean and dry; do not feed that milk to young animals.",
    hi: "प्रभावित थन को हल्के से दुहें, गर्म सेक लगाएं और थन साफ़-सूखा रखें; वह दूध छोटे जानवरों को न पिलाएं।",
    mr: "प्रभावित स्तन हलक्या हाताने काढा, उबदार शेक द्या आणि कास स्वच्छ-कोरडी ठेवा; ते दूध पिलांना देऊ नका.",
  },
  RABIES: {
    en: "Do not approach the animal — rabies is fatal in humans. Anyone bitten must wash the wound with soap and water and seek medical help immediately.",
    hi: "जानवर के पास न जाएं — रेबीज मनुष्यों के लिए घातक है। काटे गए व्यक्ति को घाव साबुन-पानी से धोकर तुरंत चिकित्सा लेनी चाहिए।",
    mr: "जनावराजवळ जाऊ नका — रेबीज माणसांसाठी प्राणघातक आहे. चावलेल्या व्यक्तीने जखम साबण-पाण्याने धुवून त्वरित उपचार घ्यावेत.",
  },
  BRUC: {
    en: "Wear gloves when handling birthing or aborted material, and avoid raw milk — pasteurise milk before use. Vaccinate young female animals.",
    hi: "प्रसव या गर्भपात सामग्री संभालते समय दस्ताने पहनें, और कच्चा दूध न लें — उपयोग से पहले दूध पाश्चराइज़ करें। युवा मादाओं का टीकाकरण करें।",
    mr: "प्रसव किंवा गर्भपात साहित्य हाताळताना हातमोजे घाला, आणि कच्चे दूध टाळा — वापरण्यापूर्वी दूध पास्चराइझ करा. तरुण मादींचे लसीकरण करा.",
  },
  AI: {
    en: "Do not touch dead birds. Notify the authorities, wear a mask and gloves when handling birds, and do not move birds, eggs or litter.",
    hi: "मृत पक्षियों को न छुएं। अधिकारियों को सूचित करें, संभालते समय मास्क-दस्ताने पहनें, और पक्षी, अंडे या बिछावन न हिलाएं।",
    mr: "मेले पक्षांना स्पर्श करू नका. अधिकाऱ्यांना कळवा, हाताळताना मास्क-हातमोजे घाला, आणि पक्षी, अंडी किंवा कचरा हलवू नका.",
  },
  ND: {
    en: "Do not move birds, eggs or feed. Keep the flock dry and isolated, and notify the local veterinary office.",
    hi: "पक्षी, अंडे या चारा न हिलाएं। झुंड को सूखा और अलग रखें, और स्थानीय पशु चिकित्सा कार्यालय को सूचित करें।",
    mr: "पक्षी, अंडी किंवा खाद्य हलवू नका. कळप कोरडा आणि वेगळा ठेवा, आणि स्थानिक पशुवैद्यकीय कार्यालयास कळवा.",
  },
  HS: {
    en: "Act fast — this disease can kill within hours. Move healthy animals away immediately and call a vet.",
    hi: "तेज़ी से कार्रवाई करें — यह रोग घंटों में जान ले सकता है। स्वस्थ जानवरों को तुरंत दूर ले जाएं और पशु चिकित्सक को बुलाएं।",
    mr: "त्वरित कार्य करा — हा रोग काही तासांत जीव घेऊ शकतो. निरोगी जनावरे त्वरित दूर न्या आणि पशुवैद्यकाला बोलवा.",
  },
  BQ: {
    en: "Vaccination prevents this disease — ask about the Black Quarter vaccine for the herd. Keep animals in dry, shaded sheds.",
    hi: "टीकाकरण इस रोग से बचाता है — झुंड के लिए ब्लैक क्वार्टर टीके के बारे में पूछें। जानवरों को सूखी, छायादार पशुशाला में रखें।",
    mr: "लसीकरण या रोगापासून बचाव करते — कळपासाठी 'फऱ्या' लसीबद्दल विचारा. जनावरे कोरड्या, सावलीच्या शेडमध्ये ठेवा.",
  },
  THEIL: {
    en: "Keep the animal cool and reduce stress; ask the vet about tick control and specific fever treatment.",
    hi: "जानवर को ठंडा रखें और तनाव कम करें; टिक नियंत्रण और बुखार के विशेष इलाज के बारे में पशु चिकित्सक से पूछें।",
    mr: "जनावर थंड ठेवा आणि ताण कमी करा; टिक नियंत्रण व तापाच्या विशेष उपचारांबद्दल पशुवैद्यकाला विचारा.",
  },
  BABES: {
    en: "Keep the animal cool and reduce stress; ask the vet about tick control and specific fever treatment.",
    hi: "जानवर को ठंडा रखें और तनाव कम करें; टिक नियंत्रण और बुखार के विशेष इलाज के बारे में पशु चिकित्सक से पूछें।",
    mr: "जनावर थंड ठेवा आणि ताण कमी करा; टिक नियंत्रण व तापाच्या विशेष उपचारांबद्दल पशुवैद्यकाला विचारा.",
  },
  TRYP: {
    en: "Keep the animal cool and reduce stress; ask the vet about the right treatment (mostly a specific antiprotozoal drug).",
    hi: "जानवर को ठंडा रखें और तनाव कम करें; सही इलाज (मुख्यतः विशेष प्रोटोज़ोआ-रोधी दवा) के बारे में पशु चिकित्सक से पूछें।",
    mr: "जनावर थंड ठेवा आणि ताण कमी करा; योग्य उपचारांबद्दल (मुख्यतः विशेष प्रोटोझोआ-विरोधी औषध) पशुवैद्यकाला विचारा.",
  },
  PPR: {
    en: "Keep the flock separate and dry; do not introduce new animals. Ask the vet about the appropriate vaccine.",
    hi: "झुंड को अलग और सूखा रखें; नए जानवर न लाएं। उचित टीके के बारे में पशु चिकित्सक से पूछें।",
    mr: "कळप वेगळा आणि कोरडा ठेवा; नवीन जनावरे आणू नका. योग्य लसीबद्दल पशुवैद्यकाला विचारा.",
  },
  GOATPOX: {
    en: "Keep the flock separate and dry; do not introduce new animals. Ask the vet about the appropriate vaccine.",
    hi: "झुंड को अलग और सूखा रखें; नए जानवर न लाएं। उचित टीके के बारे में पशु चिकित्सक से पूछें।",
    mr: "कळप वेगळा आणि कोरडा ठेवा; नवीन जनावरे आणू नका. योग्य लसीबद्दल पशुवैद्यकाला विचारा.",
  },
  BTV: {
    en: "Keep the flock separate and dry; do not introduce new animals. Ask the vet about the appropriate vaccine.",
    hi: "झुंड को अलग और सूखा रखें; नए जानवर न लाएं। उचित टीके के बारे में पशु चिकित्सक से पूछें।",
    mr: "कळप वेगळा आणि कोरडा ठेवा; नवीन जनावरे आणू नका. योग्य लसीबद्दल पशुवैद्यकाला विचारा.",
  },
  ET: {
    en: "Stop rich feed, keep animals in a clean dry pen, and consult a vet — vaccination helps prevent this disease.",
    hi: "उच्च पोषक चारा बंद करें, जानवरों को साफ सूखी जगह रखें, और पशु चिकित्सक से परामर्श लें — टीकाकरण इस रोग को रोकने में मदद करता है।",
    mr: "जास्त पौष्टिक चारा थांबवा, जनावरे स्वच्छ कोरड्या जागी ठेवा, आणि पशुवैद्यकाचा सल्ला घ्या — लसीकरण या रोगापासून संरक्षण देते.",
  },
  CSF: {
    en: "Keep the piggery clean and isolated; do not move pigs. Notify the local veterinary department immediately.",
    hi: "सूअर बाड़े को साफ़-सुथरा और अलग रखें; सूअर न हिलाएं। स्थानीय पशु विभाग को तुरंत सूचित करें।",
    mr: "डुकरांचा गोठ स्वच्छ व वेगळा ठेवा; डुकरे हलवू नका. स्थानिक पशु विभागाला त्वरित कळवा.",
  },
};

/**
 * Disease-specific first-aid line for the given code, localised to `locale`.
 * Falls back to generic guidance (then English) without throwing.
 */
export function diseaseAdvice(
  code: string,
  locale: "en" | "hi" | "mr"
): string {
  const entry = DISEASE_ADVICE[code] ?? GENERIC;
  return entry[locale] ?? entry.en;
}
