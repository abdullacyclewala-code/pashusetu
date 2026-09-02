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

  // future-proof: KB symptom keys not yet translated fall back to a
  // readable label instead of throwing MISSING_MESSAGE
  const symptomLabel = (s: string) =>
    t.has(`symptoms.${s}`) ? t(`symptoms.${s}`) : s.replace(/_/g, " ");

  return (
    <div className="card overflow-hidden">
      {/* header: urgency + top suspicion */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line-2 px-5 py-4">
        <span
          className="rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em]"
          style={{ background: style.bg, color: style.fg }}
        >
          {t(`triage.urgency.${urgency}`)}
        </span>
        {best ? (
          <div className="min-w-0">
            <div className="text-[15px] font-bold">
              {t("triage.suspected")}: {candidateName(best, locale)}
            </div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-mut">
              {t("triage.confidence")} {Math.round(best.confidence * 100)}%
            </div>
          </div>
        ) : (
          <div className="text-[13.5px] text-mut">{t("triage.noCandidates")}</div>
        )}
      </div>

      {/* candidates with reasons — the explainability core */}
      {best && (
        <div className="flex flex-col gap-4 px-5 py-4">
          {(compact ? candidates.slice(0, 1) : candidates).map((c, i) => (
            <div key={c.code}>
              <div className="mb-1 flex items-center gap-3">
                <span className="text-[13.5px] font-semibold">
                  {i + 1}. {candidateName(c, locale)}
                </span>
                <span className="text-[11.5px] font-semibold text-mut">
                  {Math.round(c.confidence * 100)}%
                </span>
              </div>
              <div className="mb-2 h-[5px] overflow-hidden rounded-full bg-line-2">
                <div
                  className="h-full rounded-full bg-sage"
                  style={{ width: `${Math.max(4, c.confidence * 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.matched.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-sage-soft px-2.5 py-1 text-[11.5px] font-medium text-sage"
                  >
                    ✓ {symptomLabel(s)}
                  </span>
                ))}
                {!compact &&
                  c.missed.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-mut2"
                    >
                      {symptomLabel(s)}?
                    </span>
                  ))}
              </div>
              {!compact && (
                <ul className="mt-2 flex flex-col gap-0.5">
                  {c.reasons.map((r, j) => (
                    <li key={j} className="text-[12.5px] text-mut">
                      · {reasonText(r, t)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* advisory */}
      {advisory && (
        <div className="border-t border-line-2 bg-paper/50 px-5 py-4">
          <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
            {t("triage.advisoryTitle")}
          </div>
          <ul className="flex flex-col gap-1">
            {advisory
              .split("\n")
              .slice(compact ? 0 : 1, compact ? 4 : -1)
              .map((line, i) => (
                <li key={i} className="text-[13px] leading-relaxed text-ink-2">
                  {line}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* hard rule: disclaimer, always */}
      <div className="border-t border-line-2 px-5 py-3">
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
