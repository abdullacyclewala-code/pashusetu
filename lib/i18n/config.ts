export const LOCALES = ["en", "hi", "mr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "pashusetu_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  hi: "हिं",
  mr: "मरा",
};
