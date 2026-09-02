"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

/**
 * Switches the UI language: sets the locale cookie and, when logged in,
 * persists it to profiles.language_pref so advisories follow the same choice.
 */
export async function setLocale(locale: string) {
  if (!LOCALES.includes(locale as Locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Persist to the profile when Supabase is configured and a user is signed in.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const uid = data?.claims?.sub;
    if (uid) {
      await supabase
        .from("profiles")
        .update({ language_pref: locale })
        .eq("id", uid);
    }
  }

  revalidatePath("/", "layout");
}
