"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { setLocale } from "@/lib/actions/locale";
import type { Profile } from "@/lib/types";

/**
 * Reconciles the UI language with the signed-in user's saved `language_pref`.
 *
 * The locale is stored in a cookie (fast, server-rendered) and posted to
 * `profiles.language_pref` by `setLocale`. This runs when the dashboard mounts
 * so that a user signing in on a fresh browser/device (where the cookie has not
 * been set yet) is shown in their preferred language instead of the default.
 * It fires once and is a no-op when the two already agree, so it never causes
 * a flicker in the normal case.
 */
export function LocalePrefSync({ profile }: { profile: Profile }) {
  const locale = useLocale();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (profile.language_pref && profile.language_pref !== locale) {
      void setLocale(profile.language_pref);
    }
  }, [profile.language_pref, locale]);

  return null;
}
