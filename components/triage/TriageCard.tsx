"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Candidate, Reason, Urgency } from "@/lib/triage/types";
import { SpeciesIcon } from "@/components/SpeciesIcon";
import {
  InfoIcon,
  CheckCircleIcon,
  ClipboardIcon,
  FileChartIcon,
  AlertTriangleIcon,
} from "@/components/icons";

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

/** Circular confidence gauge. Compact on phones — the wrapper div sets
 *  the rendered size, the SVG scales with it. */
function ConfidenceRing({
  pct,
  color,
  label,
}: {
  pct: number;
  color: string;
  label: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="h-[92px] w-[92px] max-[760px]:h-[60px] max-[760px]:w-[60px]">
        <svg viewBox="0 0 92 92" width="100%" height="100%">
          <circle cx="46" cy="46" r={r} stroke="var(--line-2)" strokeWidth="7" fill="none" />
          <circle
            cx="46"
            cy="46"
            r={r}
            stroke={color}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(c * Math.max(0.02, pct)).toFixed(1)} ${c.toFixed(1)}`}
            transform="rotate(-90 46 46)"
          />
          <text
            x="46"
            y="53"
            textAnchor="middle"
            fontSize="21"
            fontWeight="700"
            fill="var(--ink)"
          >
            {Math.round(pct * 100)}%
          </text>
        </svg>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-mut max-[760px]:hidden">
        {label}
      </span>
    </div>
  );
}

/**
 * Triage result presented as a clinical report, not a data dump:
 *   1. verdict card  — urgency banner · suspected disease · sign-match
 *                      summary · matching signs · confidence gauge
 *   2. action card   — numbered what-to-do steps
 *   3. analysis card — collapsed full reasoning + other possibilities
 *   4. disclaimer strip — always
 */
export function TriageCard({
  candidates,
  urgency,
  advisory,
  meta,
  species,
  compact = false,
}: {
  candidates: Candidate[];
  urgency: Urgency;
  advisory: string | null;
  meta?: string;
  species?: string;
  compact?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [allSigns, setAllSigns] = useState(false);
  const best = candidates[0];
  const style = URGENCY_STYLE[urgency];
  const others = candidates.slice(1);
  const totalSigns = best ? best.matched.length + best.missed.length : 0;

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
    <div className="flex flex-col gap-2.5">
      {/* ================= 1 · VERDICT ================= */}
      <div className="card overflow-hidden">
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
              className="ml-auto flex min-w-0 items-center gap-2 text-[11.5px] font-semibold"
              style={{ color: style.fg, opacity: 0.8 }}
            >
              {species && <SpeciesIcon species={species} className="h-4 w-4 shrink-0" />}
              <span className="truncate">{meta}</span>
            </span>
          )}
        </div>

        {best ? (
          <div className="grid grid-cols-[1.5fr_1fr] max-[760px]:grid-cols-1">
            {/* left: the finding */}
            <div className="px-6 py-5 max-[760px]:px-5">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                {t("triage.suspectedDisease")}
              </div>
              <h3 className="mt-1.5 font-serif text-[25px] font-semibold leading-tight">
                {candidateName(best, locale)}
              </h3>

              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line-2 bg-paper/70 px-3.5 py-3">
                <InfoIcon className="mt-px h-4 w-4 shrink-0 text-accent" />
                <p className="text-[13px] leading-relaxed text-ink-2">
                  {t("triage.matchNote", {
                    matched: best.matched.length,
                    total: totalSigns,
                  })}
                </p>
              </div>

              <div className="mt-4 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                {t("triage.matchingSigns")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {best.matched.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1.5 text-[12px] font-semibold text-sage"
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    {symptomLabel(s)}
                  </span>
                ))}
                {allSigns &&
                  best.missed.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-line px-3 py-1.5 text-[12px] text-mut"
                    >
                      {symptomLabel(s)}
                    </span>
                  ))}
              </div>
              {best.missed.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAllSigns((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent"
                >
                  {allSigns
                    ? t("triage.hideSigns")
                    : t("triage.viewAllSigns", { total: totalSigns })}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`h-3 w-3 transition ${allSigns ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              )}
            </div>

            {/* right: confidence — side-by-side strip on phones */}
            <div className="flex flex-col items-center justify-center gap-3.5 border-l border-line-2 px-6 py-5 max-[760px]:flex-row max-[760px]:gap-4 max-[760px]:border-l-0 max-[760px]:border-t max-[760px]:px-5 max-[760px]:py-3.5">
              <ConfidenceRing
                pct={best.confidence}
                color={style.ring}
                label={t("triage.confidence")}
              />
              <p className="max-w-[240px] rounded-xl bg-gold-soft/60 px-3.5 py-2.5 text-center text-[12px] leading-relaxed text-ink-2 max-[760px]:max-w-none max-[760px]:flex-1 max-[760px]:bg-transparent max-[760px]:p-0 max-[760px]:text-left">
                {t("triage.confNote")}{" "}
                <span className="font-bold text-accent">
                  {t("triage.notADiagnosis")}
                </span>
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 max-[760px]:px-5">
            <p className="text-[13.5px] leading-relaxed text-mut">
              {t("triage.noCandidates")}
            </p>
          </div>
        )}
      </div>

      {/* ================= 2 · WHAT TO DO NOW ================= */}
      {advisoryLines.length > 0 && (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_230px] max-[760px]:grid-cols-1">
            <div className="px-6 py-5 max-[760px]:px-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-[#8A6D1F]">
                  <ClipboardIcon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[12.5px] font-bold uppercase tracking-[0.1em]">
                  {t("triage.advisoryTitle")}
                </span>
              </div>
              <ol className="mt-4 flex flex-col gap-2.5">
                {advisoryLines.map((line, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gold-soft text-[12px] font-bold text-[#8A6D1F]">
                      {i + 1}
                    </span>
                    <span className="text-[13.5px] leading-relaxed text-ink-2">
                      {line}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            {species && (
              <div className="hidden flex-col items-center justify-center gap-3.5 border-l border-line-2 px-6 py-5 text-center min-[761px]:flex">
                <span className="grid h-24 w-24 place-items-center rounded-full bg-accent-soft/60 text-ink-2">
                  <SpeciesIcon species={species} className="h-12 w-12" />
                </span>
                <p className="max-w-[180px] text-[12.5px] leading-relaxed text-mut">
                  {t("triage.actionNote")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 3 · FULL ANALYSIS ================= */}
      {!compact && best && (
        <details className="card group overflow-hidden">
          <summary className="flex cursor-pointer select-none items-center gap-3.5 px-6 py-4 transition hover:bg-paper/60 max-[760px]:px-5 [&::-webkit-details-marker]:hidden">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage">
              <FileChartIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold leading-snug">
                {t("triage.fullAnalysis")}
              </span>
              <span className="block truncate text-[12px] text-mut">
                {t("triage.analysisSub")}
              </span>
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-auto h-4 w-4 shrink-0 text-mut2 transition group-open:rotate-90"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </summary>

          <div className="flex flex-col gap-5 border-t border-line-2 px-6 py-5 max-[760px]:px-5">
            {/* reasoning */}
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
              <p className="mt-3 rounded-xl border border-line-2 bg-paper/70 px-3.5 py-2.5 text-[12px] leading-relaxed text-mut">
                {t("triage.urgencyNote")}
              </p>
            </div>

            {/* other possibilities */}
            {others.length > 0 && (
              <div>
                <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                  {t("triage.othersTitle")}
                </div>
                <div className="grid grid-cols-2 gap-2.5 max-[560px]:grid-cols-1">
                  {others.map((c) => {
                    const total = c.matched.length + c.missed.length;
                    return (
                      <div key={c.code} className="rounded-xl border border-line-2 px-3.5 py-3">
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

      {/* ================= 4 · DISCLAIMER ================= */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-gold-soft/50 px-4 py-3">
        <AlertTriangleIcon className="h-4 w-4 shrink-0 text-[#8A6D1F]" />
        <p className="text-[12px] leading-relaxed text-ink-2">
          {t("triage.disclaimer")}
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
