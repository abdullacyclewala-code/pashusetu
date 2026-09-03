"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { SpeciesIcon } from "@/components/SpeciesIcon";
import { TriageCard } from "@/components/triage/TriageCard";
import { XIcon, CameraIcon, InfoIcon, ClockIcon, PinIcon } from "@/components/icons";
import type { TriageRow } from "@/lib/triage/types";
import { candidateName } from "@/lib/triage/name";

interface ReportRow {
  id: string;
  species: string;
  symptoms: string[];
  sick_count: number;
  dead_count: number;
  village: string | null;
  taluka: string | null;
  district: string | null;
  created_at: string;
  status: string;
  photo_url: string | null;
  free_text: string | null;
  animal_id: string | null;
  offline_ts: string | null;
  triage_results: TriageRow[];
}

const URGENCY_COLOR: Record<string, { bg: string; fg: string; bar: string }> = {
  low: { bg: "#EDF0DE", fg: "#5E6E3E", bar: "#7A8C51" },
  medium: { bg: "#FBF3DC", fg: "#8A6D1F", bar: "#B98523" },
  high: { bg: "#FBE9DC", fg: "#A85B1F", bar: "#C06A2A" },
  critical: { bg: "#F9E3DB", fg: "#A8431F", bar: "#A8431F" },
};

export function TriageClient({ reports }: { reports: ReportRow[] }) {
  const t = useTranslations();
  const format = useFormatter();
  const locale = useLocale();
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [selected]);

  if (reports.length === 0) return null;

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-3">
        {reports.map((r) => {
          const triage = r.triage_results.find((x) => x.source === "rule_engine") ?? r.triage_results[0];
          const best = triage?.disease_candidates[0];
          const urgency = triage?.urgency ?? "medium";
          const col = URGENCY_COLOR[urgency] ?? URGENCY_COLOR.medium;
          const isPending = !triage;

          return (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="group text-left rounded-[20px] border border-line bg-card shadow-[var(--shadow-card)] overflow-hidden transition hover:border-mut2 hover:shadow-[0_2px_8px_rgba(37,28,17,0.06)]"
            >
              <div className="h-1 w-full" style={{ background: isPending ? "#EAE1CD" : col.bar }} />
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-paper text-ink-2 group-hover:bg-card">
                  <SpeciesIcon species={r.species} className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold leading-tight text-ink">
                      {isPending ? t("cases.pendingTriage") : best ? candidateName(best, locale) : t("triage.noCandidates")}
                    </span>
                    {!isPending && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                        style={{ background: col.bg, color: col.fg }}
                      >
                        {t(`triage.urgency.${urgency}`)}
                      </span>
                    )}
                    {r.photo_url && (
                      <span className="flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-mut">
                        <CameraIcon className="h-3 w-3" />
                        Photo
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-mut">
                    <span>{t(`species.${r.species}`)}</span>
                    <span className="h-1 w-1 rounded-full bg-line" />
                    <span>
                      {r.sick_count} {t("cases.sick")}
                      {r.dead_count > 0 ? ` · ${r.dead_count} ${t("cases.dead")}` : ""}
                    </span>
                    {r.village && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-line" />
                        <span className="flex items-center gap-1">
                          <PinIcon className="h-3 w-3" />
                          {r.village}
                        </span>
                      </>
                    )}
                    <span className="h-1 w-1 rounded-full bg-line" />
                    <span suppressHydrationWarning>
                      {format.dateTime(new Date(r.created_at), { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {!isPending && best && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.round(best.confidence * 100)}%`, background: col.bar }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-mut">
                        {Math.round(best.confidence * 100)}% {t("triage.confidence").toLowerCase()}
                      </span>
                    </div>
                  )}
                  {isPending && <div className="progress-run mt-2 max-w-[160px]" />}
                </div>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-card text-mut group-hover:border-ink group-hover:text-ink">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {mounted &&
        selected &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end justify-center md:items-center md:p-6">
            <button
              aria-label={t("common.close")}
              className="absolute inset-0 bg-ink/50 backdrop-blur-[3px]"
              onClick={() => setSelected(null)}
            />
            <div className="relative flex h-[92dvh] max-h-[92dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[28px] border border-line bg-card shadow-2xl md:h-auto md:max-h-[88vh] md:rounded-[28px] animate-[pageIn_0.24s_ease]">
              <div className="grid shrink-0 place-items-center pt-3 md:hidden">
                <span className="h-1.5 w-10 rounded-full bg-line" />
              </div>
              <div className="flex shrink-0 items-start gap-4 border-b border-line-2 px-6 py-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper text-ink-2">
                  <SpeciesIcon species={selected.species} className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-[20px] font-semibold leading-tight">
                      {(() => {
                        const tr =
                          selected.triage_results.find((x) => x.source === "rule_engine") ?? selected.triage_results[0];
                        return tr?.disease_candidates[0]
                          ? candidateName(tr.disease_candidates[0], locale)
                          : t("cases.pendingTriage");
                      })()}
                    </h3>
                    {(() => {
                      const tr =
                        selected.triage_results.find((x) => x.source === "rule_engine") ?? selected.triage_results[0];
                      if (!tr) return null;
                      const col = URGENCY_COLOR[tr.urgency];
                      return (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{ background: col.bg, color: col.fg }}
                        >
                          {t(`triage.urgency.${tr.urgency}`)}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="mt-1 text-[12.5px] text-mut">
                    {[selected.village, selected.taluka, selected.district].filter(Boolean).join(", ")} ·{" "}
                    {t(`species.${selected.species}`)} · {selected.sick_count} {t("cases.sick")}
                    {selected.dead_count > 0 ? ` · ${selected.dead_count} ${t("cases.dead")}` : ""} ·{" "}
                    {format.dateTime(new Date(selected.created_at), { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-card text-mut hover:border-ink hover:text-ink"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
                <div className="flex flex-col gap-5 pb-[env(safe-area-inset-bottom)]">
                  {(() => {
                    const triage =
                      selected.triage_results.find((x) => x.source === "rule_engine") ?? selected.triage_results[0];
                    if (!triage) {
                      return (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3 rounded-2xl border border-line-2 bg-paper/70 px-4 py-4 text-[13.5px] text-mut">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-sage" />
                            {t("triage.pendingResult")} — {t("triage.pendingHint")}
                          </div>
                          {selected.photo_url ? (
                            <div className="overflow-hidden rounded-2xl border border-line bg-paper">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={selected.photo_url}
                                alt="Report photo"
                                className="max-h-[420px] w-full bg-paper object-contain"
                                loading="eager"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                  const fb = document.getElementById(`f-photo-${selected.id}`);
                                  if (fb) fb.style.display = "block";
                                }}
                              />
                              <div
                                id={`f-photo-${selected.id}`}
                                style={{ display: "none" }}
                                className="px-4 py-6 text-center text-[13px] text-mut"
                              >
                                {t("common.photoFailedToLoad")}{" "}
                                <a
                                  href={selected.photo_url!}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-accent underline"
                                >
                                  {t("common.openOriginal")}
                                </a>
                              </div>
                            </div>
                          ) : null}
                          {selected.free_text && (
                            <div className="rounded-2xl border border-line-2 bg-paper/70 px-4 py-3.5">
                              <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                                {t("common.yourNote")}
                              </div>
                              <p className="text-[14px] leading-relaxed text-ink-2">“{selected.free_text}”</p>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="flex flex-col gap-5">
                        <TriageCard
                          candidates={triage.disease_candidates}
                          urgency={triage.urgency}
                          species={selected.species}
                          meta={`${t(`species.${selected.species}`)} · ${selected.village ?? ""}`}
                        />

                        {selected.photo_url ? (
                          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selected.photo_url}
                              alt="Report photo"
                              className="max-h-[420px] w-full bg-paper object-contain"
                              loading="eager"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                                const fb = document.getElementById(`f-photo2-${selected.id}`);
                                if (fb) fb.style.display = "block";
                              }}
                            />
                            <div
                              id={`f-photo2-${selected.id}`}
                              style={{ display: "none" }}
                              className="px-4 py-6 text-center text-[13px] text-mut"
                            >
                              {t("common.photoFailedToLoad")}{" "}
                              <a
                                href={selected.photo_url!}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-accent underline"
                              >
                                {t("common.openOriginal")}
                              </a>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-line-2 px-3 py-2 text-[11.5px] text-mut">
                              <span className="flex items-center gap-1.5">
                                <CameraIcon className="h-3.5 w-3.5" />
                                {t("common.photoYouAttached")}
                              </span>
                              <a
                                href={selected.photo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-ink-2 underline"
                              >
                                {t("common.open")}
                              </a>
                            </div>
                          </div>
                        ) : null}

                        {selected.free_text && (
                          <div className="rounded-2xl border border-line-2 bg-paper/70 px-4 py-3.5">
                            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                              {t("common.yourNote")}
                            </div>
                            <p className="text-[14px] leading-relaxed text-ink-2">“{selected.free_text}”</p>
                          </div>
                        )}

                        <div className="rounded-2xl border border-line-2 bg-paper/60 px-4 py-3.5">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="grid h-7 w-7 place-items-center rounded-xl bg-sage-soft text-sage">
                              <InfoIcon className="h-4 w-4" />
                            </span>
                            <span className="text-[12.5px] font-bold uppercase tracking-[0.1em]">{t("common.reportDetails")}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-[13px]">
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-mut2">{t("common.symptomsLabel")}</div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {(selected.symptoms ?? []).map((s) => (
                                  <span key={s} className="rounded-full bg-card border border-line px-2.5 py-1 text-[11.5px]">
                                    {t.has(`symptoms.${s}`) ? t(`symptoms.${s}`) : s.replace(/_/g, " ")}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-mut2">{t("common.countsLabel")}</div>
                                <div className="mt-1 font-semibold">
                                  {selected.sick_count} {t("cases.sick")}
                                  {selected.dead_count > 0 ? `, ${selected.dead_count} ${t("cases.dead")}` : ""}
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-mut2">{t("common.locationLabel")}</div>
                                <div className="mt-1 flex items-center gap-1">
                                  <PinIcon className="h-3.5 w-3.5 text-mut" />
                                  {[selected.village, selected.taluka, selected.district]
                                    .filter(Boolean)
                                    .join(", ") || "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-mut2">{t("common.capturedLabel")}</div>
                                <div className="mt-1 flex items-center gap-1 text-mut">
                                  <ClockIcon className="h-3.5 w-3.5" />
                                  {format.dateTime(new Date(selected.created_at), {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex shrink-0 items-center border-t border-line-2 bg-paper/90 px-6 py-4 backdrop-blur supports-[padding:env(safe-area-inset-bottom)]:pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button
                  onClick={() => setSelected(null)}
                  className="w-full rounded-full border border-line bg-card px-4 py-3 text-[14px] font-bold text-ink-2 hover:border-ink"
                >
                  {t("common.close")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
