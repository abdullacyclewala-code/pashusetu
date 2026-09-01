"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ROLES } from "@/lib/types";
import { CowIcon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * Sign-up captures role + location up front; a DB trigger
 * (handle_new_user) turns the metadata into a profiles row.
 */
export default function SignupPage() {
  const t = useTranslations("auth");
  const tr = useTranslations("roles");
  const locale = useLocale();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "farmer",
    village: "",
    taluka: "",
    district: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          role: form.role,
          phone: form.phone || null,
          language_pref: locale,
          village: form.village || null,
          taluka: form.taluka || null,
          district: form.district || null,
        },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // If email confirmation is enabled there is no session yet.
    if (!data.session) {
      setNotice(t("confirmEmail"));
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="page-in mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-ink text-sage-on">
            <CowIcon className="h-[19px] w-[19px]" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-tight">
            Pashu<b className="text-accent">Setu</b>
          </span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="card p-7">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">
          {t("signupTitle")}
        </h1>
        <p className="lede mt-1 mb-6">{t("signupSub")}</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="field-label" htmlFor="name">{t("name")}</label>
            <input id="name" required className="field" value={form.name} onChange={set("name")} />
          </div>

          <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
            <div>
              <label className="field-label" htmlFor="email">{t("email")}</label>
              <input id="email" type="email" required autoComplete="email" className="field" value={form.email} onChange={set("email")} />
            </div>
            <div>
              <label className="field-label" htmlFor="password">{t("password")}</label>
              <input id="password" type="password" required minLength={6} autoComplete="new-password" className="field" value={form.password} onChange={set("password")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
            <div>
              <label className="field-label" htmlFor="role">{t("role")}</label>
              <select id="role" className="field" value={form.role} onChange={set("role")}>
                {ROLES.filter((r) => r !== "admin").map((r) => (
                  <option key={r} value={r}>{tr(r)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="phone">{t("phone")}</label>
              <input id="phone" type="tel" className="field" value={form.phone} onChange={set("phone")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 max-[420px]:grid-cols-1">
            <div>
              <label className="field-label" htmlFor="village">{t("village")}</label>
              <input id="village" className="field" value={form.village} onChange={set("village")} />
            </div>
            <div>
              <label className="field-label" htmlFor="taluka">{t("taluka")}</label>
              <input id="taluka" className="field" value={form.taluka} onChange={set("taluka")} />
            </div>
            <div>
              <label className="field-label" htmlFor="district">{t("district")}</label>
              <input id="district" className="field" value={form.district} onChange={set("district")} />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-[#FBEDE7] px-3 py-2 text-[13px] text-accent">{error}</p>
          )}
          {notice && (
            <p className="rounded-lg bg-sage-soft px-3 py-2 text-[13px] text-sage">{notice}</p>
          )}

          <button type="submit" disabled={loading} className="btn btn-dark btn-lg">
            {loading ? t("working") : t("signupBtn")}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[13.5px] text-mut">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-accent">
          {t("loginLink")}
        </Link>
      </p>
    </div>
  );
}
