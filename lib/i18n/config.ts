export const LOCALES = ["en", "hi", "mr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "pashusetu_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  hi: "हिं",
  mr: "मरा",
};

/** BCP-47 speech tag for text-to-speech (browser SpeechSynthesis + Bhashini). */
export const SPEECH_LANG: Record<Locale, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

/** Bhashini (GoI) uses bare ISO-639-1 codes. */
export const BHASHINI_LANG: Record<Locale, string> = {
  en: "en",
  hi: "hi",
  mr: "mr",
};
