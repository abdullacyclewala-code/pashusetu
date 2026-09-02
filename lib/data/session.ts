import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Session profile, fetched once per request.
 *
 * Perf notes:
 *  - `auth.getClaims()` verifies the JWT locally (no network round-trip,
 *    unlike `auth.getUser()`); the middleware has already refreshed and
 *    validated the session for every request.
 *  - `cache()` dedupes the profile query when both the dashboard layout
 *    and a page ask for it during the same render.
 */
export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .single<Profile>();

  return profile ?? null;
});
