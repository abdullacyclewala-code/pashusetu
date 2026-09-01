"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/lib/actions/locale";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <div className="langseg" style={{ opacity: pending ? 0.6 : 1 }}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className={l === locale ? "active" : ""}
          onClick={() => startTransition(() => setLocale(l))}
          aria-label={`Switch language to ${l}`}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
