"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Candidate, Reason, Urgency } from "@/lib/triage/types";

const URGENCY_STYLE: Record<Urgency, { bg: string; fg: string }> = {
  low: { bg: "#EDF0DE", fg: "#5E6E3E" },
  medium: { bg: "#FBF3DC", fg: "#8A6D1F" },
  high: { bg: "#FBE9DC", fg: "#A85B1F" },
  critical: { bg: "#F9E3DB", fg: "#A8431F" },
};

function candidateName(c: Candidate, locale: string): string {
  if (locale === "hi" && c.name_hi) return c.name_hi;
  if (locale === "mr" && c.name_mr) return c.name_mr;
  return c.name_en;
}

/**
 * Explainable triage result with a strict reading order:
 *   1. verdict   — suspected disease + urgency + confidence
 *   2. action    — "what to do now" advisory (the part a farmer needs)
 *   3. evidence  — matched signs + reasons for the top candidate
 *   4. appendix  — other possibilities, collapsed by default
 *   5. hard rule — disclaimer, always visible
 */
export function TriageCard({
  candidates,
  urgency,
  advisory,
  compact = false,
}: {
  candidates: Candidate[];
  urgency: Urgency;
  advisory: string | null;
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const best = candidates[0];
  const style = URGENCY_STYLE[urgency];
  const others = candidates.slice(1);

  // KB symptom keys not yet translated fall back to a readable label
  const symptomLabel = (s: string) =>
    t.has(`symptoms.${s}`) ? t(`symptoms.${s}`) : s.replace(/_/g, " ");

  const advisoryLines = advisory
    ? advisory
        .split("\n")
        .slice(compact ? 0 : 1, compact ? 4 : -1)
        .filter((l) => l.trim())
    : [];

  return (
    <div className="card overflow-hidden">
      {/* ---- 1 · verdict ---- */}
      <div className="flex items-start gap-3 px-5 pt-4 pb-4">
        <div className="min-w-0">
          {best ? (
            <>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                {t("triage.suspected")}
              </div>
              <div className="mt-0.5 font-serif text-[21px] font-semibold leading-tight">
                {candidateName(best, locale)}
              </div>
              <div className="mt-1 text-[12px] font-semibold text-mut">
                {t("triage.confidence")} · {Math.round(best.confidence * 100)}%
              </div>
            </>
          ) : (
            <p className="pt-1 text-[13.5px] leading-relaxed text-mut">
              {t("triage.noCandidates")}
            </p>
          )}
        </div>
        <span
          className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em]"
          style={{ background: style.bg, color: style.fg }}
        >
          {t(`triage.urgency.${urgency}`)}
        </span>
      </div>

      {/* ---- 2 · what to do now ---- */}
      {advisoryLines.length > 0 && (
        <div className="mx-5 mb-4 rounded-2xl bg-gold-soft px-4 py-3.5">
          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8A6D1F]">
            {t("triage.advisoryTitle")}
          </div>
          <ul className="flex flex-col gap-1.5">
            {advisoryLines.map((line, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#B98523]" />
                {line.replace(/^[-•·]\s*/, "")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- 3 · why this result ---- */}
      {best && (
        <div className="border-t border-line-2 px-5 py-4">
          <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
            {t("triage.whyTitle")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {best.matched.map((s) => (
              <span
                key={s}
                className="rounded-full bg-sage-soft px-2.5 py-1 text-[11.5px] font-medium text-sage"
              >
                ✓ {symptomLabel(s)}
              </span>
            ))}
            {!compact &&
              best.missed.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-mut2"
                >
                  {symptomLabel(s)}?
                </span>
              ))}
          </div>
          {!compact && best.reasons.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {best.reasons.map((r, j) => (
                <li key={j} className="flex gap-2 text-[12.5px] leading-relaxed text-mut">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-mut2" />
                  {reasonText(r, t)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---- 4 · other possibilities (collapsed) ---- */}
      {!compact && others.length > 0 && (
        <details className="group border-t border-line-2">
          <summary className="flex cursor-pointer select-none items-center gap-2 px-5 py-3 text-[12.5px] font-semibold text-mut transition hover:text-ink [&::-webkit-details-marker]:hidden">
            {t("triage.othersTitle")}
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-line-2 px-1 text-[10.5px] font-bold text-mut">
              {others.length}
            </span>
            <span className="ml-auto text-[10px] transition group-open:rotate-180">
              ▼
            </span>
          </summary>
          <div className="flex flex-col gap-4 px-5 pb-4">
            {others.map((c) => {
              const total = c.matched.length + c.missed.length;
              return (
                <div key={c.code}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold">
                      {candidateName(c, locale)}
                    </span>
                    <span className="ml-auto text-[11.5px] font-semibold text-mut">
                      {Math.round(c.confidence * 100)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line-2">
                    <div
                      className="h-full rounded-full bg-mut2"
                      style={{ width: `${Math.max(4, c.confidence * 100)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[12px] text-mut">
                    {t("triage.reasons.symptom_match", {
                      matched: c.matched.length,
                      total,
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* ---- 5 · hard rule: disclaimer, always ---- */}
      <div className="border-t border-line-2 bg-paper/60 px-5 py-3">
        <p className="text-[11.5px] leading-relaxed text-mut">
          ⚠ {t("triage.disclaimer")}
        </p>
      </div>
    </div>
  );
}

function reasonText(
  r: Reason,
  t: ReturnType<typeof useTranslations>
): string {
  switch (r.key) {
    case "symptom_match":
      return t("triage.reasons.symptom_match", {
        matched: r.matched,
        total: r.total,
      });
    case "hallmark":
      return t("triage.reasons.hallmark", {
        symptom: t.has(`symptoms.${r.symptom}`)
          ? t(`symptoms.${r.symptom}`)
          : r.symptom.replace(/_/g, " "),
      });
    case "season":
      return t("triage.reasons.season");
    case "nearby":
      return t("triage.reasons.nearby", { count: r.count });
    case "zoonotic":
      return t("triage.reasons.zoonotic");
    case "notifiable":
      return t("triage.reasons.notifiable");
  }
}
