"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Candidate, Reason, Urgency } from "@/lib/triage/types";

const URGENCY_STYLE: Record<
  Urgency,
  { bg: string; fg: string; ring: string }
> = {
  low: { bg: "#EDF0DE", fg: "#5E6E3E", ring: "#7A8C51" },
  medium: { bg: "#FBF3DC", fg: "#8A6D1F", ring: "#B98523" },
  high: { bg: "#FBE9DC", fg: "#A85B1F", ring: "#C06A2A" },
  critical: { bg: "#F9E3DB", fg: "#A8431F", ring: "#A8431F" },
};

function candidateName(c: Candidate, locale: string): string {
  if (locale === "hi" && c.name_hi) return c.name_hi;
  if (locale === "mr" && c.name_mr) return c.name_mr;
  return c.name_en;
}

/** Circular confidence gauge — the card's visual anchor. */
function ConfidenceRing({
  pct,
  color,
  label,
}: {
  pct: number;
  color: string;
  label: string;
}) {
  const r = 24;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} stroke="var(--line-2)" strokeWidth="6" fill="none" />
        <circle
          cx="32"
          cy="32"
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * pct).toFixed(1)} ${c.toFixed(1)}`}
          transform="rotate(-90 32 32)"
        />
        <text
          x="32"
          y="37"
          textAnchor="middle"
          fontSize="14.5"
          fontWeight="700"
          fill="var(--ink)"
        >
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-mut2">
        {label}
      </span>
    </div>
  );
}

/**
 * Triage result as a "diagnosis ticket":
 *   urgency banner → verdict + confidence gauge → matched signs →
 *   numbered what-to-do steps → full analysis (collapsed) → disclaimer.
 */
export function TriageCard({
  candidates,
  urgency,
  advisory,
  meta,
  compact = false,
}: {
  candidates: Candidate[];
  urgency: Urgency;
  advisory: string | null;
  meta?: string;
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
        .map((l) => l.replace(/^[-•·]\s*/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <div className="card overflow-hidden">
      {/* ---- urgency banner ---- */}
      <div
        className="flex items-center gap-2.5 px-5 py-2.5"
        style={{ background: style.bg }}
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: style.fg }}
        />
        <span
          className="text-[11.5px] font-bold uppercase tracking-[0.08em]"
          style={{ color: style.fg }}
        >
          {t(`triage.urgency.${urgency}`)}
        </span>
        {meta && (
          <span
            className="ml-auto truncate text-[11.5px] font-semibold"
            style={{ color: style.fg, opacity: 0.75 }}
          >
            {meta}
          </span>
        )}
      </div>

      {/* ---- verdict ---- */}
      <div className="flex items-center gap-4 px-5 pt-4 pb-3">
        {best ? (
          <>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                {t("triage.suspected")}
              </div>
              <div className="mt-1 font-serif text-[22px] font-semibold leading-tight">
                {candidateName(best, locale)}
              </div>
              {/* matched signs — the proof, right under the name */}
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {best.matched.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-sage-soft px-2.5 py-1 text-[11.5px] font-semibold text-sage"
                  >
                    ✓ {symptomLabel(s)}
                  </span>
                ))}
              </div>
            </div>
            <ConfidenceRing
              pct={best.confidence}
              color={style.ring}
              label={t("triage.confidence")}
            />
          </>
        ) : (
          <p className="py-1 text-[13.5px] leading-relaxed text-mut">
            {t("triage.noCandidates")}
          </p>
        )}
      </div>

      {/* ---- what to do now: numbered steps ---- */}
      {advisoryLines.length > 0 && (
        <div className="px-5 pb-4 pt-1">
          <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#8A6D1F]">
            {t("triage.advisoryTitle")}
          </div>
          <ol className="flex flex-col gap-2">
            {advisoryLines.map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-soft text-[11.5px] font-bold text-[#8A6D1F]">
                  {i + 1}
                </span>
                <span className="text-[13.5px] leading-relaxed text-ink-2">
                  {line}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ---- full analysis, collapsed ---- */}
      {!compact && best && (
        <details className="group border-t border-line-2">
          <summary className="flex cursor-pointer select-none items-center gap-2 px-5 py-3.5 text-[13px] font-semibold text-accent transition hover:bg-paper/60 [&::-webkit-details-marker]:hidden">
            {t("triage.fullAnalysis")}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-auto h-3.5 w-3.5 transition group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>

          <div className="flex flex-col gap-5 px-5 pb-5 pt-1">
            {/* why this result */}
            <div>
              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                {t("triage.whyTitle")}
              </div>
              <ul className="flex flex-col gap-1.5">
                {best.reasons.map((r, j) => (
                  <li key={j} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
                    <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-gold" />
                    {reasonText(r, t)}
                  </li>
                ))}
              </ul>
            </div>

            {/* signs not observed */}
            {best.missed.length > 0 && (
              <div>
                <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                  {t("triage.notObserved")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {best.missed.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-mut"
                    >
                      {symptomLabel(s)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* other possibilities */}
            {others.length > 0 && (
              <div>
                <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                  {t("triage.othersTitle")}
                </div>
                <div className="flex flex-col gap-3">
                  {others.map((c) => {
                    const total = c.matched.length + c.missed.length;
                    return (
                      <div key={c.code} className="rounded-xl border border-line-2 px-3.5 py-2.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-semibold">
                            {candidateName(c, locale)}
                          </span>
                          <span className="ml-auto text-[11.5px] font-bold text-mut">
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
              </div>
            )}
          </div>
        </details>
      )}

      {/* ---- hard rule: disclaimer, always ---- */}
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
