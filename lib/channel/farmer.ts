/**
 * PashuSetu · P7 — resolve-or-provision a farmer profile by phone number.
 *
 * WhatsApp (and IVR) arrive without a session, so we map the inbound phone to a
 * real `profiles` row (and the `auth.users` link behind it). If the number has
 * never reported, we create a deterministic service user so the report can be
 * attributed to a real farmer identity — then the same triage / cluster / case
 * pipeline runs as if they had used the app.
 *
 * This speaks to the Supabase auth admin API, so it must ONLY run server-side
 * with the service-role key (never exposed to the browser).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface FarmerProfile {
  id: string;
  name: string | null;
  phone: string | null;
  role: string | null;
  village: string | null;
  taluka: string | null;
  district: string | null;
  language_pref: string | null;
}

/** Normalise a phone to E.164 (`+` + country code + national number). */
export function normalizePhone(raw: string): string {
  let digits = (raw ?? "").replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) digits = "+" + digits.replace(/\D/g, "");
  // crude India fallback: if we only see a 10-digit local number, assume +91
  const num = digits.replace("+", "");
  if (num.length === 10) digits = "+91" + num;
  return digits;
}

function toEmail(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `wa${digits}@channel.pashusetu.in`;
}

export interface ProvisionOptions {
  name?: string;
  district?: string | null;
  village?: string | null;
  taluka?: string | null;
  languagePref?: string;
}

/**
 * Return the farmer profile for `phone`, creating the linked auth user +
 * profile if it doesn't exist yet. Idempotent and concurrency-safe.
 */
export async function resolveFarmer(
  supabase: SupabaseClient,
  phoneRaw: string,
  opts: ProvisionOptions = {}
): Promise<FarmerProfile> {
  const phone = normalizePhone(phoneRaw);

  const existing = await supabase
    .from("profiles")
    .select("id, name, phone, role, village, taluka, district, language_pref")
    .eq("phone", phone)
    .maybeSingle<FarmerProfile>();

  if (existing.data) {
    // top up any missing geography/language the first report supplied
    const patch: Record<string, unknown> = {};
    if (!existing.data.district && opts.district) patch.district = opts.district;
    if (!existing.data.village && opts.village) patch.village = opts.village;
    if (!existing.data.taluka && opts.taluka) patch.taluka = opts.taluka;
    if (!existing.data.language_pref && opts.languagePref) patch.language_pref = opts.languagePref;
    if (Object.keys(patch).length) {
      await supabase.from("profiles").update(patch).eq("id", existing.data.id);
    }
    return { ...existing.data, ...patch };
  }

  const email = toEmail(phone);
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: "PashuSetu@" + Math.random().toString(36).slice(2, 10),
    email_confirm: true,
    user_metadata: {
      role: "farmer",
      name: opts.name ?? `Farmer ${phone.slice(-4)}`,
      phone,
      village: opts.village ?? null,
      taluka: opts.taluka ?? null,
      district: opts.district ?? null,
      language_pref: opts.languagePref ?? "en",
    },
  });

  if (error || !created.user) {
    // Race: user already exists — re-fetch by phone.
    const reread = await supabase
      .from("profiles")
      .select("id, name, phone, role, village, taluka, district, language_pref")
      .eq("phone", phone)
      .maybeSingle<FarmerProfile>();
    if (reread.data) return reread.data;
    throw new Error(`resolveFarmer: ${error?.message ?? "could not create user"}`);
  }

  return {
    id: created.user.id,
    name: created.user.user_metadata?.name ?? null,
    phone,
    role: created.user.user_metadata?.role ?? "farmer",
    village: created.user.user_metadata?.village ?? null,
    taluka: created.user.user_metadata?.taluka ?? null,
    district: created.user.user_metadata?.district ?? null,
    language_pref: created.user.user_metadata?.language_pref ?? "en",
  };
}
