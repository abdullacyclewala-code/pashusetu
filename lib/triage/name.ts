import type { Candidate } from "./types";

/**
 * The disease display name for a candidate in the given locale, falling back
 * to English when a localised name is missing (e.g. the KB row was inserted
 * before name_hi/name_mr were filled in).
 */
export function candidateName(c: Candidate, locale: string): string {
  if (locale === "hi" && c.name_hi) return c.name_hi;
  if (locale === "mr" && c.name_mr) return c.name_mr;
  return c.name_en;
}
