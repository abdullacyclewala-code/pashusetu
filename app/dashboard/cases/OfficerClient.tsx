"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { SpeciesIcon } from "@/components/SpeciesIcon";
import {
  CheckIcon,
  XIcon,
  DownloadIcon,
  PinIcon,
  RowsIcon,
  CameraIcon,
  InfoIcon,
  ClockIcon,
} from "@/components/icons";
import {
  OFFICER_ROW_SELECT,
  type OfficerKpis,
  type OfficerReportRow,
} from "@/lib/officer/types";
import type { Candidate } from "@/lib/triage/types";
import type { MapPoint } from "./CaseMap";

const CaseMap = dynamic(
  () => import("./CaseMap").then((m) => m.CaseMap),
  {
    ssr: false,
    loading: () => (
      <div className="skel h-[320px] w-full rounded-[18px] md:h-[420px]" />
    ),
  }
);

const CHIP: Record<string, { bg: string; fg: string }> = {
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

type Filter = "all" | "review" | "decided";

interface Props {
  initialRows: OfficerReportRow[];
  kpis: OfficerKpis;
  canDecide: boolean;
}

export function OfficerClient({ initialRows, kpis, canDecide }: Props) {
  const t = useTranslations();
  const format = useFormatter();
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<OfficerReportRow[]>(initialRows);
  const [filter, setFilter] = useState<Filter>("all");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OfficerReportRow | null>(null);

  /* ── realtime: new district reports appear at the top instantly ───── */
  useEffect(() => {
    const refetch = (id: string) => {
      supabase
        .from("reports")
        .select(OFFICER_ROW_SELECT)
        .eq("id", id)
        .single<OfficerReportRow>()
        .then(({ data }) => {
          if (data) {
            setRows((rs) => rs.map((r) => (r.id === id ? data : r)));
            setSelected((cur) => (cur && cur.id === id ? (data as OfficerReportRow) : cur));
          }
        });
    };

    const channel = supabase
      .channel("officer-queue")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          const id = n.id as string;
          setRows((rs) =>
            rs.some((r) => r.id === id)
              ? rs
              : [
                  {
                    id,
                    species: (n.species as string) ?? "other",
                    symptoms: (n.symptoms as string[]) ?? [],
                    sick_count: (n.sick_count as number) ?? 0,
                    dead_count: (n.dead_count as number) ?? 0,
                    village: (n.village as string) ?? null,
                    taluka: (n.taluka as string) ?? null,
                    district: (n.district as string) ?? null,
                    status: (n.status as string) ?? "pending",
                    created_at:
                      (n.created_at as string) ?? new Date().toISOString(),
                    lat: null,
                    lng: null,
                    photo_url: (n.photo_url as string) ?? null,
                    free_text: (n.free_text as string) ?? null,
                    animal_id: (n.animal_id as string) ?? null,
                    reporter_id: (n.reporter_id as string) ?? null,
                    offline_ts: (n.offline_ts as string) ?? null,
                    animals: null,
                    reporter: null,
                    triage_results: [],
                    cases: [],
                  } as OfficerReportRow,
                  ...rs,
                ]
          );
          setNewIds((s) => new Set(s).add(id));
          setTimeout(() => refetch(id), 4000);
          setTimeout(() => refetch(id), 10000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  /* close drawer on escape */
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    // lock body scroll on mobile
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [selected]);

  /* ── officer decision (optimistic; RPC re-checks role + district) ── */
  const decide = async (id: string, decision: "confirmed" | "rejected") => {
    const prev = rows;
    setBusy(id);
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, cases: [{ status: decision }] } : r))
    );
    setSelected((cur) =>
      cur && cur.id === id ? { ...cur, cases: [{ status: decision }] } : cur
    );
    const { error: e } = await supabase.rpc("officer_decide", {
      p_report_id: id,
      p_decision: decision,
    });
    if (e) {
      setRows(prev);
      setError(t("cases.decideError"));
      setTimeout(() => setError(null), 4000);
    }
    setBusy(null);
  };

  /* ── derived ──────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (filter === "review") return rows.filter((r) => !r.cases[0]);
    if (filter === "decided") return rows.filter((r) => !!r.cases[0]);
    return rows;
  }, [rows, filter]);

  const points = useMemo<MapPoint[]>(
    () =>
      rows
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => {
          const tr = r.triage_results[0];
          const c = tr?.disease_candidates[0];
          return {
            id: r.id,
            lat: r.lat as number,
            lng: r.lng as number,
            urgency: tr?.urgency ?? "medium",
            title: r.village ?? r.district ?? "",
            sub: `${c ? candidateName(c, locale) : t("cases.pendingTriage")} · ${t(
              `species.${r.species}`
            )} · ${r.sick_count + r.dead_count}`,
            weight: r.sick_count + 2 * r.dead_count,
          };
        }),
    [rows, locale, t]
  );

  /* ── CSV export of the visible queue ──────────────────────────────── */
  const exportCsv = () => {
    const head = [
      "report_id",
      "created_at",
      "village",
      "taluka",
      "district",
      "species",
      "sick",
      "dead",
      "symptoms",
      "free_text",
      "photo_url",
      "tag_id",
      "top_disease",
      "urgency",
      "confidence",
      "case_status",
    ];
    const lines = filtered.map((r) => {
      const tr = r.triage_results[0];
      const c = tr?.disease_candidates[0];
      return [
        r.id,
        r.created_at,
        r.village ?? "",
        r.taluka ?? "",
        r.district ?? "",
        r.species,
        r.sick_count,
        r.dead_count,
        (r.symptoms ?? []).join("; "),
        r.free_text ?? "",
        r.photo_url ?? "",
        r.animals?.tag_id ?? "",
        c?.name_en ?? "",
        tr?.urgency ?? "",
        tr?.confidence ?? "",
        r.cases[0]?.status ?? "undecided",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    const blob = new Blob(["\ufeff" + [head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pashusetu-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const kpiCards: Array<{ label: string; value: string }> = [
    { label: t("cases.kpiReports24h"), value: String(kpis.reports24h) },
    { label: t("cases.kpiOpenCases"), value: String(kpis.openCases) },
    { label: t("cases.kpiClusters"), value: String(kpis.clusters) },
    {
      label: t("cases.kpiTriageTime"),
      value:
        kpis.medianTriageMin == null
          ? "—"
          : kpis.medianTriageMin < 1
            ? "<1 " + t("cases.minShort")
            : `${kpis.medianTriageMin} ${t("cases.minShort")}`,
    },
  ];

  const symptomLabel = (s: string) =>
    t.has(`symptoms.${s}`) ? t(`symptoms.${s}`) : s.replace(/_/g, " ");

  return (
    <div className="mt-6 flex flex-col gap-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpiCards.map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-line bg-card px-4 py-3.5 shadow-[var(--shadow-card)]"
          >
            <div className="font-serif text-[26px] font-semibold leading-none text-ink">
              {k.value}
            </div>
            <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-mut">
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* map */}
      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
              <PinIcon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[14px] font-bold text-ink">
                {t("cases.mapTitle")}
              </div>
              <div className="text-[11.5px] text-mut">{t("cases.mapHint")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {(["low", "medium", "high", "critical"] as const).map((u) => (
              <span key={u} className="flex items-center gap-1 text-[10.5px] text-mut">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: CHIP[u].fg }}
                />
                {t(`triage.urgency.${u}`)}
              </span>
            ))}
          </div>
        </div>
        <div className="border-t border-line-2 p-2">
          {points.length === 0 ? (
            <div className="grid h-[220px] place-items-center px-6 text-center text-[13px] text-mut">
              {t("cases.mapEmpty")}
            </div>
          ) : (
            <CaseMap points={points} />
          )}
        </div>
      </div>

      {/* queue */}
      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-sage-soft text-sage">
              <RowsIcon className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
                {t("cases.queueTitle")}
                <span className="flex items-center gap-1.5 rounded-full bg-sage-soft px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-sage">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-sage opacity-60" />
                    <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                  </span>
                  {t("cases.liveBadge")}
                </span>
              </div>
              <div className="text-[11.5px] text-mut">{t("cases.queueHint")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(["all", "review", "decided"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  filter === f
                    ? "bg-ink text-paper"
                    : "border border-line bg-card text-mut hover:text-ink"
                }`}
              >
                {t(`cases.filter_${f}`)}
              </button>
            ))}
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-ink"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              {t("cases.exportCsv")}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-2 rounded-xl bg-[#F9E3DB] px-4 py-2.5 text-[13px] font-semibold text-accent">
            {error}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="border-t border-line-2 px-6 py-12 text-center text-[13.5px] text-mut">
            {t("cases.emptyBody")}
          </div>
        ) : (
          <ul className="border-t border-line-2">
            {filtered.map((r) => {
              const tr = r.triage_results[0];
              const c = tr?.disease_candidates[0];
              const chip = tr ? CHIP[tr.urgency] : null;
              const decision = r.cases[0]?.status;
              const isNew = newIds.has(r.id);
              const hasExtra = !!r.photo_url || !!r.free_text;
              return (
                <li
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`group flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-line-2 px-5 py-4 last:border-b-0 transition-colors hover:bg-paper/70 ${
                    isNew ? "bg-gold-soft/40" : ""
                  } ${selected?.id === r.id ? "bg-paper" : ""}`}
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-paper text-ink-2 group-hover:bg-card">
                    <SpeciesIcon species={r.species} className="h-6 w-6" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14.5px] font-bold text-ink">
                        {c ? candidateName(c, locale) : t("cases.pendingTriage")}
                      </span>
                      {chip && tr && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{ background: chip.bg, color: chip.fg }}
                        >
                          {t(`triage.urgency.${tr.urgency}`)}
                        </span>
                      )}
                      {hasExtra && (
                        <span className="flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-mut">
                          {r.photo_url && <CameraIcon className="h-3 w-3" />}
                          {r.photo_url && r.free_text ? "Photo + note" : r.photo_url ? "Photo" : "Note"}
                        </span>
                      )}
                      {isNew && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                          {t("cases.newBadge")}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-mut">
                      {[r.village, r.taluka].filter(Boolean).join(", ")} ·{" "}
                      {t(`species.${r.species}`)} · {r.sick_count}{" "}
                      {t("cases.sick")}
                      {r.dead_count > 0 && (
                        <span className="font-semibold text-accent">
                          {" "}· {r.dead_count} {t("cases.dead")}
                        </span>
                      )}{" "}
                      ·{" "}
                      <span suppressHydrationWarning>
                        {format.relativeTime(new Date(r.created_at), new Date())}
                      </span>
                    </div>
                  </div>

                  {(canDecide || decision) && (
                    <div className="flex items-center gap-2 max-[760px]:w-full max-[760px]:pl-[60px]">
                      {canDecide && !decision && (
                        <>
                          <button
                            disabled={busy === r.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              decide(r.id, "confirmed");
                            }}
                            className="flex items-center gap-1.5 rounded-full bg-sage px-3.5 py-2 text-[12.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            {t("cases.confirm")}
                          </button>
                          <button
                            disabled={busy === r.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              decide(r.id, "rejected");
                            }}
                            className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[12.5px] font-bold text-mut transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                            {t("cases.reject")}
                          </button>
                        </>
                      )}
                      {decision === "confirmed" && (
                        <span className="flex items-center gap-1.5 rounded-full bg-sage-soft px-3 py-1.5 text-[11.5px] font-bold text-sage">
                          <CheckIcon className="h-3.5 w-3.5" />
                          {t("cases.confirmedChip")}
                        </span>
                      )}
                      {decision === "rejected" && (
                        <span className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-[11.5px] font-bold text-mut">
                          <XIcon className="h-3.5 w-3.5" />
                          {t("cases.rejectedChip")}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-line-2 bg-paper/60 px-5 py-3 text-[11.5px] leading-relaxed text-mut">
          {t("cases.flywheelNote")}
        </div>
      </div>

      {/* ── DETAIL DRAWER ── */}
      {selected && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-6">
          <button
            aria-label="Close"
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            onClick={() => setSelected(null)}
          />
          <div className="relative flex max-h-[92vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[28px] border border-line bg-card shadow-2xl md:rounded-[28px] animate-[pageIn_0.24s_ease]">
            {/* handle bar mobile */}
            <div className="grid place-items-center pt-3 md:hidden">
              <span className="h-1.5 w-10 rounded-full bg-line" />
            </div>

            {/* header */}
            <div className="flex items-start gap-4 border-b border-line-2 px-6 py-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-paper text-ink-2">
                <SpeciesIcon species={selected.species} className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-[20px] font-semibold leading-tight">
                    {selected.triage_results[0]?.disease_candidates[0]
                      ? candidateName(selected.triage_results[0].disease_candidates[0], locale)
                      : t("cases.pendingTriage")}
                  </h3>
                  {selected.triage_results[0] && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                      style={{
                        background: CHIP[selected.triage_results[0].urgency].bg,
                        color: CHIP[selected.triage_results[0].urgency].fg,
                      }}
                    >
                      {t(`triage.urgency.${selected.triage_results[0].urgency}`)}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[12.5px] text-mut">
                  {[selected.village, selected.taluka, selected.district].filter(Boolean).join(", ")} ·{" "}
                  {t(`species.${selected.species}`)} · {selected.sick_count} {t("cases.sick")}
                  {selected.dead_count > 0 ? ` · ${selected.dead_count} ${t("cases.dead")}` : ""} ·{" "}
                  {format.dateTime(new Date(selected.created_at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-card text-mut hover:border-ink hover:text-ink"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-5">
                {/* photo */}
                {selected.photo_url && (
                  <div className="overflow-hidden rounded-2xl border border-line bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.photo_url}
                      alt="Report photo"
                      className="max-h-[360px] w-full object-cover"
                    />
                    <div className="flex items-center gap-2 px-3 py-2 text-[11.5px] text-mut">
                      <CameraIcon className="h-3.5 w-3.5" />
                      Farmer attached photo
                    </div>
                  </div>
                )}

                {/* free text */}
                {selected.free_text && (
                  <div className="rounded-2xl border border-line-2 bg-paper/70 px-4 py-3.5">
                    <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                      Farmer note
                    </div>
                    <p className="text-[14px] leading-relaxed text-ink-2">“{selected.free_text}”</p>
                  </div>
                )}

                {/* quick stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                      Animals affected
                    </div>
                    <div className="mt-1 font-serif text-[18px] font-semibold">
                      {selected.sick_count} sick{selected.dead_count > 0 ? ` · ${selected.dead_count} dead` : ""}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                      Location
                    </div>
                    <div className="mt-1 text-[13px] font-semibold leading-snug">
                      {[selected.village, selected.taluka, selected.district].filter(Boolean).join(", ") || "—"}
                    </div>
                    {selected.lat != null && selected.lng != null && (
                      <div className="mt-0.5 text-[11.5px] text-mut">
                        {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}
                      </div>
                    )}
                  </div>
                </div>

                {/* symptoms */}
                <div>
                  <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                    Reported signs
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.symptoms ?? []).map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-line bg-card px-3 py-1.5 text-[12px] font-medium text-ink-2"
                      >
                        {symptomLabel(s)}
                      </span>
                    ))}
                    {(selected.symptoms ?? []).length === 0 && (
                      <span className="text-[13px] text-mut">No checklist signs — free text only</span>
                    )}
                  </div>
                </div>

                {/* animal + reporter */}
                <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                  <div className="rounded-2xl border border-line-2 bg-paper/60 px-4 py-3">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                      Linked animal
                    </div>
                    <div className="mt-1 text-[13px] font-semibold">
                      {selected.animals?.tag_id
                        ? `Tag ${selected.animals.tag_id}`
                        : selected.animal_id
                          ? `Animal ${selected.animal_id.slice(0, 8)}…`
                          : "Not linked"}
                    </div>
                    {selected.animals?.breed && (
                      <div className="text-[12px] text-mut">{selected.animals.breed}</div>
                    )}
                  </div>
                  <div className="rounded-2xl border border-line-2 bg-paper/60 px-4 py-3">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                      Reported by
                    </div>
                    <div className="mt-1 text-[13px] font-semibold">
                      {selected.reporter?.name ?? "—"}
                    </div>
                    <div className="text-[12px] text-mut">
                      {[selected.reporter?.village, selected.reporter?.phone].filter(Boolean).join(" · ") ||
                        selected.reporter_id?.slice(0, 8) + "…"}
                    </div>
                  </div>
                </div>

                {/* triage details */}
                {selected.triage_results[0] && (
                  <div className="rounded-2xl border border-line bg-card">
                    <div className="flex items-center gap-2 px-4 py-3">
                      <span className="grid h-7 w-7 place-items-center rounded-xl bg-sage-soft text-sage">
                        <InfoIcon className="h-4 w-4" />
                      </span>
                      <span className="text-[12.5px] font-bold uppercase tracking-[0.1em]">Triage result</span>
                      <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-mut">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {Math.round((selected.triage_results[0].confidence ?? 0) * 100)}% confidence
                      </span>
                    </div>
                    <div className="border-t border-line-2 px-4 py-3">
                      <div className="text-[13px] leading-relaxed text-ink-2">
                        {selected.triage_results[0].advisory_text ?? "—"}
                      </div>
                      {selected.triage_results[0].disease_candidates?.length > 1 && (
                        <div className="mt-3">
                          <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                            Other possibilities
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selected.triage_results[0].disease_candidates.slice(1, 4).map((c: Candidate) => (
                              <span
                                key={c.code}
                                className="rounded-full bg-paper px-2.5 py-1 text-[11.5px] text-mut"
                              >
                                {candidateName(c, locale)} · {Math.round(c.confidence * 100)}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ids for debug / export */}
                <div className="rounded-xl bg-paper/60 px-3 py-2 text-[11px] text-mut">
                  Report ID: {selected.id} · Status: {selected.status} · Captured:{" "}
                  {selected.offline_ts
                    ? format.dateTime(new Date(selected.offline_ts), { dateStyle: "short", timeStyle: "short" })
                    : format.dateTime(new Date(selected.created_at), { dateStyle: "short", timeStyle: "short" })}
                </div>
              </div>
            </div>

            {/* footer actions */}
            <div className="flex items-center gap-2 border-t border-line-2 bg-paper/80 px-6 py-4 backdrop-blur">
              {canDecide && !selected.cases[0] ? (
                <>
                  <button
                    disabled={busy === selected.id}
                    onClick={() => decide(selected.id, "confirmed")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-sage px-4 py-3 text-[14px] font-bold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {t("cases.confirm")}
                  </button>
                  <button
                    disabled={busy === selected.id}
                    onClick={() => decide(selected.id, "rejected")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-card px-4 py-3 text-[14px] font-bold text-mut hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    <XIcon className="h-4 w-4" />
                    {t("cases.reject")}
                  </button>
                </>
              ) : selected.cases[0]?.status === "confirmed" ? (
                <div className="flex w-full items-center justify-center gap-2 rounded-full bg-sage-soft px-4 py-3 text-[14px] font-bold text-sage">
                  <CheckIcon className="h-4 w-4" />
                  {t("cases.confirmedChip")} — field team notified
                </div>
              ) : selected.cases[0]?.status === "rejected" ? (
                <div className="flex w-full items-center justify-center gap-2 rounded-full bg-paper px-4 py-3 text-[14px] font-bold text-mut">
                  <XIcon className="h-4 w-4" />
                  {t("cases.rejectedChip")} — closed
                </div>
              ) : (
                <div className="w-full text-center text-[13px] text-mut">Awaiting officer decision</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
