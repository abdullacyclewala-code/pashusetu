"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Candidate } from "@/lib/triage/types";
import { candidateName } from "@/lib/triage/name";
import { diseaseAdvice } from "@/lib/advisory";
import { SPEECH_LANG } from "@/lib/i18n/config";
import { ListenButton } from "./ListenButton";

/**
 * Localised, offline-first advisory. Instead of rendering a stored English
 * string, the steps are assembled here from the candidate (disease name,
 * confidence, zoonotic/notifiable flags) plus a disease-specific first-aid
 * line — all in the caller's locale. Because it uses next-intl, switching the
 * language re-renders the advisory instantly (P4 acceptance).
 *
 * Always ends with the "consult a vet" step; the disclaimer strip is rendered
 * separately by the caller.
 */
export function AdvisoryPanel({
  candidate,
  compact = false,
  showListen = true,
}: {
  candidate?: Candidate | null;
  compact?: boolean;
  showListen?: boolean;
}) {
  const t = useTranslations("triage.advisory");
  const locale = useLocale();

  const steps: string[] = [];

  if (candidate) {
    steps.push(
      t("intro", {
        disease: candidateName(candidate, locale),
        confidence: Math.round(candidate.confidence * 100),
      })
    );
  }

  steps.push(t("isolate"));
  steps.push(t("care"));
  steps.push(t("stopSpread"));

  if (candidate) {
    steps.push(diseaseAdvice(candidate.code, locale as "en" | "hi" | "mr"));
    if (candidate.zoonotic) steps.push(t("zoonotic"));
    steps.push(candidate.notifiable ? t("notifiable") : t("contactVet"));
  } else {
    steps.push(t("contactVet"));
  }

  const speechLang = SPEECH_LANG[(locale as keyof typeof SPEECH_LANG) ?? "en"];
  const fullText = steps.join(" ");

  return (
    <div className="flex flex-col gap-3">
      <ol className={`flex flex-col ${compact ? "gap-2" : "gap-2.5"}`}>
        {steps.map((line, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gold-soft text-[12px] font-bold text-[#8A6D1F]">
              {i + 1}
            </span>
            <span className="text-[13.5px] leading-relaxed text-ink-2">{line}</span>
          </li>
        ))}
      </ol>
      {showListen && <ListenButton text={fullText} language={speechLang} />}
    </div>
  );
}
