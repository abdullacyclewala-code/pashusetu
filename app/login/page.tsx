"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { CowIcon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="page-in mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-5 py-10">
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
          {t("loginTitle")}
        </h1>
        <p className="lede mt-1 mb-6">{t("loginSub")}</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="field-label" htmlFor="email">
              {t("email")}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="password">
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-[#FBEDE7] px-3 py-2 text-[13px] text-accent">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-dark btn-lg">
            {loading ? t("working") : t("loginBtn")}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[13.5px] text-mut">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-semibold text-accent">
          {t("signupLink")}
        </Link>
      </p>
    </div>
  );
}
