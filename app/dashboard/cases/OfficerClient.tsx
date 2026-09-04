"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { SpeciesIcon } from "@/components/SpeciesIcon";
import { AdvisoryPanel } from "@/components/triage/AdvisoryPanel";
import { candidateName } from "@/lib/triage/name";
import { clusterColor, clusterDiseaseName } from "@/lib/clusters";
import type { ClusterRow } from "@/lib/alerts/types";
import {
  CheckIcon,
  XIcon,
  DownloadIcon,
  PinIcon,
  RowsIcon,
  CameraIcon,
  InfoIcon,
  ClockIcon,
  AlertTriangleIcon,
  FlaskIcon,
  ArrowRightIcon,
  ClipboardIcon,
} from "@/components/icons";
import {
  OFFICER_ROW_SELECT,
  diseaseName,
  type OfficerKpis,
  type OfficerReportRow,
  type OfficerCase,
  type SampleRow,
  type VetRow,
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

const CASE_CHIP: Record<string, { bg: string; fg: string }> = {
  suspected: { bg: "#FBF3DC", fg: "#8A6D1F" },
  confirmed: { bg: "#EDF0DE", fg: "#5E6E3E" },
  contained: { bg: "#E3EBF1", fg: "#3E6E8A" },
  closed: { bg: "#ECECEC", fg: "#5A5A5A" },
  rejected: { bg: "#F3E3E3", fg: "#9A4D4D" },
};

const SAMPLE_CHIP: Record<string, { bg: string; fg: string }> = {
  collected: { bg: "#EDF0DE", fg: "#5E6E3E" },
  in_transit: { bg: "#FBF3DC", fg: "#8A6D1F" },
  received: { bg: "#E3EBF1", fg: "#3E6E8A" },
  resulted: { bg: "#E9EDE0", fg: "#5A7A3E" },
};

const SPECIMENS = ["blood", "swab", "serum", "milk", "urine"];
const RESULTS = ["positive", "negative", "inconclusive"];

type Filter = "all" | "review" | "decided";

interface Props {
  initialRows: OfficerReportRow[];
  initialClusters?: ClusterRow[];
  kpis: OfficerKpis;
  canDecide: boolean;
  district: string | null;
}

export function OfficerClient({
  initialRows,
  initialClusters,
  kpis,
  canDecide,
  district,
}: Props) {
  const t = useTranslations();
  const format = useFormatter();
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<OfficerReportRow[]>(initialRows);
  const [clusters, setClusters] = useState<ClusterRow[]>(initialClusters ?? []);
  const [filter, setFilter] = useState<Filter>("all");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OfficerReportRow | null>(null);
  const [mounted, setMounted] = useState(false);

  // P6 escalation + lab state
  const [vets, setVets] = useState<VetRow[]>([]);
  const [vetId, setVetId] = useState<string>("");
  const [note, setNote] = useState("");
  const [newSpecimen, setNewSpecimen] = useState("blood");
  const [creatingSample, setCreatingSample] = useState(false);
  const [resultForm, setResultForm] = useState<Record<string, boolean>>({});
  const [resultVal, setResultVal] = useState<Record<string, string>>({});
  const [resultSum, setResultSum] = useState<Record<string, string>>({});

  useEffect(() => setMounted(true), []);

  /* ── load vets for the assign dropdown (district-scoped) ── */
  useEffect(() => {
    let active = true;
    const q = supabase
      .from("vets")
      .select("id, name, phone, district, taluka")
      .order("name", { ascending: true });
    q.then(({ data }) => {
      if (!active) return;
      const all = (data as VetRow[] | null) ?? [];
      setVets(district ? all.filter((v) => v.district === district) : all);
    });
    return () => {
      active = false;
    };
  }, [supabase, district]);

  /* ── refresh a single report row (matches the SSR select) ── */
  const refreshReport = useCallback(
    (id: string) =>
      supabase
        .from("reports")
        .select(OFFICER_ROW_SELECT)
        .eq("id", id)
        .single<OfficerReportRow>()
        .then(({ data }) => {
          if (data) {
            setRows((rs) => rs.map((r) => (r.id === id ? data : r)));
            setSelected((cur) => (cur && cur.id === id ? data : cur));
          }
        }),
    [supabase]
  );

  /* ── realtime ───── */
  useEffect(() => {
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
          setTimeout(() => refreshReport(id), 4000);
          setTimeout(() => refreshReport(id), 10000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refreshReport]);

  /* ── realtime: active clusters stream into the strip ── */
  useEffect(() => {
    const channel = supabase
      .channel("officer-clusters")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clusters" },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          if (n.status !== "active") return;
          supabase
            .from("clusters")
            .select(
              "id, disease_guess, case_count, radius_km, district, village, severity, status, first_seen, last_seen, created_at, lat, lng, diseases:clusters_disease_guess_fkey(code, name_en, name_hi, name_mr)"
            )
            .eq("id", n.id as string)
            .maybeSingle<ClusterRow>()
            .then(({ data }) => {
              if (!data) return;
              setClusters((prev) =>
                prev.some((c) => c.id === data.id) ? prev : [data, ...prev]
              );
            });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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

  const flashError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const decide = async (id: string, decision: "confirmed" | "rejected") => {
    const prev = rows;
    setBusy(id);
    setRows((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              cases: [
                {
                  id: "pending",
                  report_id: id,
                  status: decision,
                  disease_code: null,
                  severity: null,
                  district: null,
                  assigned_vet_id: null,
                  escalated_at: null,
                  contained_at: null,
                  closed_at: null,
                  notes: null,
                  updated_at: "",
                  vet: null,
                  samples: [],
                  case_events: [],
                } as OfficerCase,
              ],
            }
          : r
      )
    );
    setSelected((cur) =>
      cur && cur.id === id
        ? {
            ...cur,
            cases: [
              {
                id: "pending",
                report_id: id,
                status: decision,
                disease_code: null,
                severity: null,
                district: null,
                assigned_vet_id: null,
                escalated_at: null,
                contained_at: null,
                closed_at: null,
                notes: null,
                updated_at: "",
                vet: null,
                samples: [],
                case_events: [],
              } as OfficerCase,
            ],
          }
        : cur
    );
    const { error: e } = await supabase.rpc("officer_decide", {
      p_report_id: id,
      p_decision: decision,
    });
    if (e) {
      setRows(prev);
      flashError(t("cases.decideError"));
    } else {
      await refreshReport(id);
    }
    setBusy(null);
  };

  /* ── P6 RPC handlers ── */
  const assignVet = async (caseId: string) => {
    if (!vetId) return;
    setBusy(caseId);
    const { error: e } = await supabase
      .rpc("case_assign_vet", { p_case: caseId, p_vet: vetId })
      .single();
    if (e) flashError(e.message || t("cases.actionError"));
    else await refreshReport(selected?.id ?? "");
    setBusy(null);
  };

  const changeStatus = async (caseId: string, status: string) => {
    setBusy(caseId);
    const { error: e } = await supabase
      .rpc("case_set_status", { p_case: caseId, p_status: status, p_note: note || null })
      .single();
    if (e) flashError(e.message || t("cases.actionError"));
    else {
      setNote("");
      if (selected) await refreshReport(selected.id);
    }
    setBusy(null);
  };

  const createSample = async (caseId: string) => {
    if (!creatingSample) {
      setCreatingSample(true);
      return;
    }
    setBusy(caseId);
    const { error: e } = await supabase
      .rpc("case_create_sample", { p_case: caseId, p_specimen: newSpecimen })
      .single();
    if (e) flashError(e.message || t("cases.actionError"));
    else {
      setCreatingSample(false);
      if (selected) await refreshReport(selected.id);
    }
    setBusy(null);
  };

  const advanceSample = async (sampleId: string, status: string) => {
    setBusy(sampleId);
    const { error: e } = await supabase
      .rpc("sample_set_status", { p_sample: sampleId, p_status: status, p_note: null })
      .single();
    if (e) flashError(e.message || t("cases.actionError"));
    else if (selected) await refreshReport(selected.id);
    setBusy(null);
  };

  const saveResult = async (sampleId: string) => {
    if (!resultVal[sampleId]?.trim()) return;
    setBusy(sampleId);
    const { error: e } = await supabase
      .rpc("sample_set_result", {
        p_sample: sampleId,
        p_result: resultVal[sampleId].trim(),
        p_result_summary: resultSum[sampleId]?.trim() || null,
      })
      .single();
    if (e) {
      flashError(e.message || t("cases.actionError"));
    } else {
      setResultForm((m) => ({ ...m, [sampleId]: false }));
      if (selected) await refreshReport(selected.id);
    }
    setBusy(null);
  };

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
      "assigned_vet",
      "barcode",
      "sample_result",
    ];
    const lines = filtered.map((r) => {
      const tr = r.triage_results[0];
      const c = tr?.disease_candidates[0];
      const cs = r.cases[0];
      const sm = cs?.samples?.[0];
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
        cs?.status ?? "undecided",
        cs?.vet?.name ?? "",
        sm?.barcode ?? "",
        sm?.result ?? "",
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

  const caseChip = (c: OfficerCase) => {
    const ch = CASE_CHIP[c.status] ?? CASE_CHIP.suspected;
    return (
      <span
        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
        style={{ background: ch.bg, color: ch.fg }}
      >
        {t(`cases.status.${c.status}`)}
      </span>
    );
  };

  const sampleChip = (s: SampleRow) => {
    const ch = SAMPLE_CHIP[s.status] ?? SAMPLE_CHIP.collected;
    return (
      <span
        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
        style={{ background: ch.bg, color: ch.fg }}
      >
        {t(`cases.sampleStatus.${s.status}`)}
      </span>
    );
  };

  const fmtDate = (iso: string | null | undefined) =>
    iso ? format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" }) : "—";

  /* ── case escalation + lab block ── */
  const renderCaseBlock = (theCase: OfficerCase) => {
    const transcript = theCase.case_events ?? [];
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-line bg-card">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-line-2 px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
              <RowsIcon className="h-4 w-4" />
            </span>
            <span className="text-[13px] font-bold uppercase tracking-[0.1em]">
              {t("cases.caseLabel")}
            </span>
            {caseChip(theCase)}
            <span className="ml-auto text-[11.5px] text-mut">
              {t("cases.caseId", { id: theCase.id.slice(0, 8) })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 px-4 py-3.5">
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                {t("cases.diseaseLabel")}
              </div>
              <div className="mt-1 text-[14px] font-semibold">
                {diseaseName(theCase.disease_code, locale)}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                {t("cases.assignedVet")}
              </div>
              <div className="mt-1 text-[14px] font-semibold">
                {theCase.vet?.name ??
                  (theCase.assigned_vet_id
                    ? theCase.assigned_vet_id.slice(0, 8)
                    : t("cases.noVet"))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line-2 px-4 py-2.5 text-[11.5px] text-mut">
            {theCase.escalated_at && (
              <span className="flex items-center gap-1">
                <ArrowRightIcon className="h-3 w-3" />
                {t("cases.escalatedAt")} {fmtDate(theCase.escalated_at)}
              </span>
            )}
            {theCase.contained_at && (
              <span className="flex items-center gap-1">
                <ArrowRightIcon className="h-3 w-3" />
                {t("cases.containedAt")} {fmtDate(theCase.contained_at)}
              </span>
            )}
            {theCase.closed_at && (
              <span className="flex items-center gap-1">
                <ArrowRightIcon className="h-3 w-3" />
                {t("cases.closedAt")} {fmtDate(theCase.closed_at)}
              </span>
            )}
            {!theCase.escalated_at && !theCase.contained_at && !theCase.closed_at && (
              <span>{t("cases.noTimestamps")}</span>
            )}
          </div>

          {theCase.notes && (
            <div className="border-t border-line-2 px-4 py-3 text-[13px] leading-relaxed text-ink-2">
              <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                {t("cases.officerNote")}
              </div>
              {theCase.notes}
            </div>
          )}
        </div>

        {/* escalation controls */}
        {canDecide && !["closed", "rejected"].includes(theCase.status) && (
          <div className="rounded-2xl border border-line-2 bg-paper/60 p-4">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.1em]">
              {t("cases.escalationTitle")}
            </div>

            {!theCase.assigned_vet_id && (
              <div className="mb-3">
                <label className="field-label" htmlFor="vet">
                  {t("cases.assignVet")}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    id="vet"
                    className="field flex-1"
                    value={vetId}
                    onChange={(e) => setVetId(e.target.value)}
                  >
                    <option value="">{t("cases.vetSelectPlaceholder")}</option>
                    {vets.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                        {v.taluka ? ` · ${v.taluka}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={busy === theCase.id || !vetId}
                    onClick={() => assignVet(theCase.id)}
                    className="btn btn-dark sm:w-auto disabled:opacity-50"
                  >
                    {busy === theCase.id ? t("common.working") : t("cases.assignVet")}
                  </button>
                </div>
                {vets.length === 0 && (
                  <p className="mt-1.5 text-[11.5px] text-mut">{t("cases.noVets")}</p>
                )}
              </div>
            )}

            <label className="field-label" htmlFor="note">
              {t("cases.noteLabel")}
            </label>
            <textarea
              id="note"
              className="field mb-3 min-h-[64px]"
              rows={2}
              placeholder={t("cases.notePlaceholder")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {theCase.status === "confirmed" && (
                <button
                  disabled={busy === theCase.id}
                  onClick={() => changeStatus(theCase.id, "contained")}
                  className="btn btn-dark flex-1 px-4 disabled:opacity-50"
                >
                  {busy === theCase.id
                    ? t("common.working")
                    : t("cases.markContained")}
                </button>
              )}
              {["confirmed", "contained"].includes(theCase.status) && (
                <button
                  disabled={busy === theCase.id}
                  onClick={() => changeStatus(theCase.id, "closed")}
                  className="btn btn-line flex-1 px-4 disabled:opacity-50"
                >
                  {busy === theCase.id
                    ? t("common.working")
                    : t("cases.markClosed")}
                </button>
              )}
              {theCase.status === "confirmed" && (
                <button
                  disabled={busy === theCase.id}
                  onClick={() => changeStatus(theCase.id, "rejected")}
                  className="btn btn-line flex-1 px-4 text-accent disabled:opacity-50"
                >
                  {busy === theCase.id ? t("common.working") : t("cases.rejectCase")}
                </button>
              )}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-mut">
              <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t("cases.closeLoopHint")}
            </p>
          </div>
        )}

        {["contained", "closed"].includes(theCase.status) && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-sage-soft bg-sage-soft/40 px-4 py-3 text-[12.5px] font-semibold text-sage">
            <CheckIcon className="h-4 w-4" />
            {t("cases.closeLoopDone")}
          </div>
        )}

        {/* samples */}
        <div className="overflow-hidden rounded-2xl border border-line bg-card">
          <div className="flex flex-wrap items-center gap-2.5 border-b border-line-2 px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-sage-soft text-sage">
              <FlaskIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-bold uppercase tracking-[0.1em]">
                {t("cases.samplesTitle")}
              </div>
              <div className="text-[11.5px] text-mut">
                {t("cases.samplesHint")}
              </div>
            </div>
            {!["closed", "rejected"].includes(theCase.status) && (
              <button
                disabled={busy === theCase.id}
                onClick={() => createSample(theCase.id)}
                className="ml-auto rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-paper disabled:opacity-50"
              >
                {busy === theCase.id
                  ? t("common.working")
                  : creatingSample
                    ? t("cases.confirmCreateSample")
                    : t("cases.createSample")}
              </button>
            )}
          </div>

          {creatingSample && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line-2 px-4 py-3">
              <select
                className="field flex-1"
                value={newSpecimen}
                onChange={(e) => setNewSpecimen(e.target.value)}
              >
                {SPECIMENS.map((s) => (
                  <option key={s} value={s}>
                    {t(`cases.specimen.${s}`)}
                  </option>
                ))}
              </select>
              <button
                disabled={busy === theCase.id}
                onClick={() => createSample(theCase.id)}
                className="btn btn-dark disabled:opacity-50"
              >
                {busy === theCase.id ? t("common.working") : t("common.save")}
              </button>
            </div>
          )}

          {(theCase.samples ?? []).length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-mut">
              {t("cases.samplesEmpty")}
            </div>
          ) : (
            <ul className="divide-y divide-line-2">
              {(theCase.samples ?? []).map((s) => {
                const custody = s.custody_json ?? [];
                return (
                  <li key={s.id} className="px-4 py-3.5">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[13px] font-bold text-ink">
                            {s.barcode ?? "—"}
                          </span>
                          {sampleChip(s)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-mut">
                          <span>
                            {t("cases.specimenType")}:{" "}
                            {t(`cases.specimen.${s.specimen_type ?? "blood"}`)}
                          </span>
                          <span>
                            {t("cases.diseaseLabel")}:{" "}
                            {diseaseName(s.disease_code, locale)}
                          </span>
                        </div>
                      </div>
                      {s.barcode && (
                        <div className="rounded-xl border border-line bg-paper p-2.5">
                          <QRCodeSVG
                            value={`${typeof window !== "undefined" ? window.location.origin : ""}/sample/${s.barcode}`}
                            size={96}
                            bgColor="#ffffff"
                            fgColor="#1a1a1a"
                            level="M"
                          />
                          <div className="mt-1 text-center text-[9.5px] font-semibold uppercase tracking-[0.1em] text-mut2">
                            {t("cases.scanHint")}
                          </div>
                          <a
                            href={`/sample/${s.barcode}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block text-center text-[10px] font-bold text-accent underline"
                          >
                            {t("cases.viewTrace")}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
                      <div className="rounded-xl bg-paper/70 px-3 py-2">
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-mut2">
                          {t("cases.collectedAt")}
                        </div>
                        <div className="mt-0.5">{fmtDate(s.collected_at)}</div>
                      </div>
                      <div className="rounded-xl bg-paper/70 px-3 py-2">
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-mut2">
                          {t("cases.receivedAt")}
                        </div>
                        <div className="mt-0.5">{fmtDate(s.received_at)}</div>
                      </div>
                      <div className="rounded-xl bg-paper/70 px-3 py-2">
                        <div className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-mut2">
                          {t("cases.resultedAt")}
                        </div>
                        <div className="mt-0.5">{fmtDate(s.resulted_at)}</div>
                      </div>
                    </div>

                    {s.result && (
                      <div className="mt-3 rounded-xl border border-line-2 bg-paper/60 px-3.5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                            {t("cases.labResult")}
                          </span>
                          <span className="rounded-full bg-sage-soft px-2.5 py-0.5 text-[11px] font-bold text-sage">
                            {t(`cases.result.${s.result}`)}
                          </span>
                        </div>
                        {s.result_summary && (
                          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                            {s.result_summary}
                          </p>
                        )}
                      </div>
                    )}

                    {/* chain of custody */}
                    {custody.length > 0 && (
                      <div className="mt-3">
                        <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                          <ClipboardIcon className="h-3.5 w-3.5" />
                          {t("cases.custodyChain")}
                        </div>
                        <ol className="flex flex-col gap-1.5">
                          {custody.map((e, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-[12px] leading-snug"
                            >
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sage" />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-ink-2">
                                  {e.action}
                                </div>
                                <div className="text-[11px] text-mut">
                                  {e.by} · {e.role} · {fmtDate(e.at)}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* pipeline controls */}
                    {["collected", "in_transit", "received"].includes(s.status) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.status === "collected" && (
                          <button
                            disabled={busy === s.id}
                            onClick={() => advanceSample(s.id, "in_transit")}
                            className="btn btn-line btn-sm disabled:opacity-50"
                          >
                            {t("cases.dispatchToLab")}
                          </button>
                        )}
                        {s.status === "in_transit" && (
                          <button
                            disabled={busy === s.id}
                            onClick={() => advanceSample(s.id, "received")}
                            className="btn btn-line btn-sm disabled:opacity-50"
                          >
                            {t("cases.markReceived")}
                          </button>
                        )}
                        {s.status === "received" && (
                          <button
                            disabled={busy === s.id}
                            onClick={() =>
                              setResultForm((m) => ({
                                ...m,
                                [s.id]: !m[s.id],
                              }))
                            }
                            className="btn btn-dark btn-sm disabled:opacity-50"
                          >
                            {t("cases.enterResult")}
                          </button>
                        )}
                      </div>
                    )}

                    {resultForm[s.id] && (
                      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-line-2 bg-paper/60 p-3">
                        <div className="flex flex-wrap gap-2">
                          {RESULTS.map((r) => (
                            <button
                              key={r}
                              onClick={() =>
                                setResultVal((v) => ({ ...v, [s.id]: r }))
                              }
                              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                                resultVal[s.id] === r
                                  ? "bg-ink text-paper"
                                  : "border border-line bg-card text-mut"
                              }`}
                            >
                              {t(`cases.result.${r}`)}
                            </button>
                          ))}
                        </div>
                        <input
                          className="field"
                          placeholder={t("cases.resultSummaryPlaceholder")}
                          value={resultSum[s.id] ?? ""}
                          onChange={(e) =>
                            setResultSum((v) => ({
                              ...v,
                              [s.id]: e.target.value,
                            }))
                          }
                        />
                        <div className="flex gap-2">
                          <button
                            disabled={busy === s.id || !resultVal[s.id]?.trim()}
                            onClick={() => saveResult(s.id)}
                            className="btn btn-dark flex-1 disabled:opacity-50"
                          >
                            {busy === s.id
                              ? t("common.working")
                              : t("cases.saveResult")}
                          </button>
                          <button
                            onClick={() =>
                              setResultForm((m) => ({ ...m, [s.id]: false }))
                            }
                            className="btn btn-line"
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* audit trail */}
        <div className="rounded-2xl border border-line bg-card">
          <div className="border-b border-line-2 px-4 py-3">
            <div className="text-[13px] font-bold uppercase tracking-[0.1em]">
              {t("cases.auditTitle")}
            </div>
            <div className="text-[11.5px] text-mut">{t("cases.auditHint")}</div>
          </div>
          {transcript.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12.5px] text-mut">
              {t("cases.auditEmpty")}
            </div>
          ) : (
            <ul className="divide-y divide-line-2">
              {transcript.map((ev) => (
                <li key={ev.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                      <span className="font-semibold capitalize text-ink-2">
                        {t(`cases.event.${ev.event_type}`)}
                      </span>
                      {ev.from_status && ev.to_status && (
                        <span className="flex items-center gap-1 text-[11px] text-mut">
                          {t(`cases.status.${ev.from_status}`)}
                          <ArrowRightIcon className="h-3 w-3" />
                          {t(`cases.status.${ev.to_status}`)}
                        </span>
                      )}
                    </div>
                    {ev.note && (
                      <div className="text-[11.5px] text-mut">{ev.note}</div>
                    )}
                    <div className="text-[10.5px] text-mut2">{fmtDate(ev.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6 flex flex-col gap-5">
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

      {/* active outbreak clusters (P5) */}
      {clusters.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5 px-5 py-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
              <AlertTriangleIcon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[14px] font-bold text-ink">
                {t("clusters.title")}
              </div>
              <div className="text-[11.5px] text-mut">{t("clusters.hint")}</div>
            </div>
            <Link
              href="/dashboard/alerts"
              className="ml-auto flex items-center gap-1 rounded-full border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-ink"
            >
              {t("nav.alerts")}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2.5 border-t border-line-2 px-5 py-3.5">
            {clusters.map((c) => {
              const color = clusterColor(c.severity);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 rounded-2xl border border-line bg-paper/60 px-3.5 py-2"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="text-[13px] font-semibold">
                    {clusterDiseaseName(c, locale)}
                  </span>
                  <span className="text-[12px] text-mut">
                    {t("clusters.cases", { count: c.case_count })}
                  </span>
                  {c.radius_km != null && (
                    <span className="text-[11.5px] text-mut2">
                      · {t("clusters.radius", { km: c.radius_km.toFixed(1) })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative isolate z-0 overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
              <PinIcon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[14px] font-bold text-ink">{t("cases.mapTitle")}</div>
              <div className="text-[11.5px] text-mut">{t("cases.mapHint")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {(["low", "medium", "high", "critical"] as const).map((u) => (
              <span key={u} className="flex items-center gap-1 text-[10.5px] text-mut">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHIP[u].fg }} />
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
                  filter === f ? "bg-ink text-paper" : "border border-line bg-card text-mut hover:text-ink"
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
              const cs = r.cases[0];
              const decision = cs?.status;
              const isNew = newIds.has(r.id);
              const hasExtra = !!r.photo_url || !!r.free_text;
              const hasSample = (cs?.samples?.length ?? 0) > 0;
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
                        {cs ? diseaseName(cs.disease_code, locale) : c ? candidateName(c, locale) : t("cases.pendingTriage")}
                      </span>
                      {chip && tr && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{ background: chip.bg, color: chip.fg }}
                        >
                          {t(`triage.urgency.${tr.urgency}`)}
                        </span>
                      )}
                      {cs && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{
                            background: (CASE_CHIP[cs.status] ?? CASE_CHIP.suspected).bg,
                            color: (CASE_CHIP[cs.status] ?? CASE_CHIP.suspected).fg,
                          }}
                        >
                          {t(`cases.status.${cs.status}`)}
                        </span>
                      )}
                      {hasSample && (
                        <span className="flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-mut">
                          <FlaskIcon className="h-3 w-3" />
                          {t("cases.hasSample")}
                        </span>
                      )}
                      {hasExtra && (
                        <span className="flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-mut">
                          {r.photo_url && <CameraIcon className="h-3 w-3" />}
                          {r.photo_url && r.free_text ? t("cases.photoNote") : r.photo_url ? t("cases.photo") : t("cases.note")}
                        </span>
                      )}
                      {isNew && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                          {t("cases.newBadge")}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-mut">
                      {[r.village, r.taluka].filter(Boolean).join(", ")} · {t(`species.${r.species}`)} · {r.sick_count}{" "}
                      {t("cases.sick")}
                      {r.dead_count > 0 && (
                        <span className="font-semibold text-accent"> · {r.dead_count} {t("cases.dead")}</span>
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
                            className="flex items-center gap-1.5 rounded-full bg-sage px-3.5 py-2 text-[12.5px] font-bold text-white hover:opacity-90 disabled:opacity-50"
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
                            className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-[12.5px] font-bold text-mut hover:border-accent hover:text-accent disabled:opacity-50"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                            {t("cases.reject")}
                          </button>
                        </>
                      )}
                      {decision && (
                        <span
                          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold"
                          style={{
                            background: (CASE_CHIP[decision] ?? CASE_CHIP.suspected).bg,
                            color: (CASE_CHIP[decision] ?? CASE_CHIP.suspected).fg,
                          }}
                        >
                          {decision === "confirmed" ? (
                            <CheckIcon className="h-3.5 w-3.5" />
                          ) : decision === "rejected" ? (
                            <XIcon className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowRightIcon className="h-3.5 w-3.5" />
                          )}
                          {t(`cases.status.${decision}`)}
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
                    {selected.cases[0] && caseChip(selected.cases[0])}
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
                          const img = e.currentTarget as HTMLImageElement;
                          img.style.display = "none";
                          const fallback = document.getElementById(`photo-fallback-${selected.id}`);
                          if (fallback) fallback.style.display = "block";
                        }}
                      />
                      <div
                        id={`photo-fallback-${selected.id}`}
                        style={{ display: "none" }}
                        className="px-4 py-6 text-center text-[13px] text-mut"
                      >
                        {t("common.photoFailedToLoad")}{" "}
                        <a href={selected.photo_url} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
                          {t("common.openOriginal")}
                        </a>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-line-2 px-3 py-2 text-[11.5px] text-mut">
                        <span className="flex items-center gap-1.5">
                          <CameraIcon className="h-3.5 w-3.5" />
                          {t("common.farmerPhoto")}
                        </span>
                        <a
                          href={selected.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-ink-2 underline"
                        >
                          Open
                        </a>
                      </div>
                    </div>
                  ) : null}

                  {selected.free_text && (
                    <div className="rounded-2xl border border-line-2 bg-paper/70 px-4 py-3.5">
                      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">{t("common.farmerNote")}</div>
                      <p className="text-[14px] leading-relaxed text-ink-2">“{selected.free_text}”</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">{t("common.animalsAffected")}</div>
                      <div className="mt-1 font-serif text-[18px] font-semibold">
                        {selected.sick_count} {t("cases.sick")}{selected.dead_count > 0 ? ` · ${selected.dead_count} ${t("cases.dead")}` : ""}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">{t("common.locationLabel")}</div>
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

                  <div>
                    <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">{t("common.reportedSigns")}</div>
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
                        <span className="text-[13px] text-mut">{t("common.noChecklistSigns")}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
                    <div className="rounded-2xl border border-line-2 bg-paper/60 px-4 py-3">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">{t("common.linkedAnimal")}</div>
                      <div className="mt-1 text-[13px] font-semibold">
                        {selected.animals?.tag_id
                          ? t("common.tagValue", { tag: selected.animals.tag_id })
                          : selected.animal_id
                            ? t("common.animalValue", { id: selected.animal_id.slice(0, 8) })
                            : t("common.notLinked")}
                      </div>
                      {selected.animals?.breed && <div className="text-[12px] text-mut">{selected.animals.breed}</div>}
                    </div>
                    <div className="rounded-2xl border border-line-2 bg-paper/60 px-4 py-3">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">{t("common.reportedBy")}</div>
                      <div className="mt-1 text-[13px] font-semibold">{selected.reporter?.name ?? "—"}</div>
                      <div className="text-[12px] text-mut">
                        {[selected.reporter?.village, selected.reporter?.phone].filter(Boolean).join(" · ") ||
                          selected.reporter_id?.slice(0, 8) + "…"}
                      </div>
                    </div>
                  </div>

                  {selected.triage_results[0] && (
                    <div className="rounded-2xl border border-line bg-card">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <span className="grid h-7 w-7 place-items-center rounded-xl bg-sage-soft text-sage">
                          <InfoIcon className="h-4 w-4" />
                        </span>
                        <span className="text-[12.5px] font-bold uppercase tracking-[0.1em]">{t("common.triageResult")}</span>
                        <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-mut">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {t("common.confidencePct", { pct: Math.round((selected.triage_results[0].confidence ?? 0) * 100) })}
                        </span>
                      </div>
                      <div className="border-t border-line-2 px-4 py-3">
                        <AdvisoryPanel candidate={selected.triage_results[0].disease_candidates?.[0]} />
                        {selected.triage_results[0].disease_candidates?.length > 1 && (
                          <div className="mt-3">
                            <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                              {t("common.otherPossibilities")}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {selected.triage_results[0].disease_candidates.slice(1, 4).map((c: Candidate) => (
                                <span key={c.code} className="rounded-full bg-paper px-2.5 py-1 text-[11.5px] text-mut">
                                  {candidateName(c, locale)} · {Math.round(c.confidence * 100)}%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selected.cases[0] && renderCaseBlock(selected.cases[0])}

                  <div className="rounded-xl bg-paper/60 px-3 py-2 text-[11px] text-mut">
                    {t("common.reportMeta", {
                      id: selected.id,
                      status: selected.status,
                      date: selected.offline_ts
                        ? format.dateTime(new Date(selected.offline_ts), { dateStyle: "short", timeStyle: "short" })
                        : format.dateTime(new Date(selected.created_at), { dateStyle: "short", timeStyle: "short" }),
                    })}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 border-t border-line-2 bg-paper/90 px-6 py-4 backdrop-blur supports-[padding:env(safe-area-inset-bottom)]:pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
                ) : selected.cases[0]?.status === "contained" ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-full bg-sage-soft px-4 py-3 text-[14px] font-bold text-sage">
                    <CheckIcon className="h-4 w-4" />
                    {t("cases.containedFooter")}
                  </div>
                ) : selected.cases[0]?.status === "closed" ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-full bg-paper px-4 py-3 text-[14px] font-bold text-mut">
                    <CheckIcon className="h-4 w-4" />
                    {t("cases.closedFooter")}
                  </div>
                ) : selected.cases[0]?.status === "rejected" ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-full bg-paper px-4 py-3 text-[14px] font-bold text-mut">
                    <XIcon className="h-4 w-4" />
                    {t("common.rejectedClosed")}
                  </div>
                ) : selected.cases[0]?.status === "confirmed" ? (
                  <div className="flex w-full items-center justify-center gap-2 rounded-full bg-sage-soft px-4 py-3 text-[14px] font-bold text-sage">
                    <CheckIcon className="h-4 w-4" />
                    {t("common.confirmedNotified")}
                  </div>
                ) : (
                  <div className="w-full text-center text-[13px] text-mut">{t("common.awaitingDecision")}</div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
