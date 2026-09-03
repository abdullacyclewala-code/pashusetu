"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { localDb, type ReportPayload } from "@/lib/offline/db";
import { syncPendingReports } from "@/lib/offline/sync";
import { compressImage } from "@/lib/report/image";
import { SPECIES, SYMPTOM_GROUPS } from "@/lib/report/constants";
import { TriageCard } from "@/components/triage/TriageCard";
import { SpeciesIcon } from "@/components/SpeciesIcon";
import { CheckIcon, ClockIcon, CameraIcon, PinIcon } from "@/components/icons";
import type { TriageRow } from "@/lib/triage/types";
import type { Profile } from "@/lib/types";

interface HerdAnimal {
  id: string;
  species: string;
  tag_id: string | null;
  breed: string | null;
}

type Step = 0 | 1 | 2 | 3 | 4;
const TOTAL_STEPS = 5;

interface FormState {
  species: string;
  symptoms: string[];
  freeText: string;
  sickCount: number;
  deadCount: number;
  animalId: string | null;
  photo: { blob: Blob; type: string; previewUrl: string } | null;
  gps: { lat: number; lng: number } | null;
  village: string;
  taluka: string;
  district: string;
}

export function ReportWizard({
  profile,
  animals,
}: {
  profile: Profile;
  animals: HerdAnimal[];
}) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>({
    species: "",
    symptoms: [],
    freeText: "",
    sickCount: 1,
    deadCount: 0,
    animalId: null,
    photo: null,
    gps: null,
    village: profile.village ?? "",
    taluka: profile.taluka ?? "",
    district: profile.district ?? "",
  });
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"synced" | "queued" | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [triage, setTriage] = useState<TriageRow | null>(null);

  // After a synced submit, poll briefly for the triage result (the DB
  // trigger + edge function usually land it within a second or two).
  useEffect(() => {
    if (done !== "synced" || !lastId) return;
    let attempts = 0;
    let cancelled = false;
    const supabase = createClient();
    const poll = async () => {
      if (cancelled || attempts++ >= 10) return;
      const { data } = await supabase
        .from("triage_results")
        .select(
          "disease_candidates, confidence, urgency, advisory_text, notifiable_flag, source"
        )
        .eq("report_id", lastId)
        .eq("source", "rule_engine")
        .maybeSingle<TriageRow>();
      if (cancelled) return;
      if (data) {
        setTriage(data);
      } else {
        setTimeout(poll, 1500);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [done, lastId]);

  const speciesAnimals = useMemo(
    () => animals.filter((a) => a.species === form.species),
    [animals, form.species]
  );

  const canNext: boolean = [
    form.species !== "",
    form.symptoms.length > 0 || form.freeText.trim() !== "",
    form.sickCount + form.deadCount >= 1,
    true, // photo optional
    form.gps !== null || (form.village.trim() !== "" && form.district.trim() !== ""),
  ][step];

  function toggleSymptom(key: string) {
    setForm((f) => ({
      ...f,
      symptoms: f.symptoms.includes(key)
        ? f.symptoms.filter((s) => s !== key)
        : [...f.symptoms, key],
    }));
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const { blob, type } = await compressImage(file);
      if (form.photo) URL.revokeObjectURL(form.photo.previewUrl);
      setForm((f) => ({
        ...f,
        photo: { blob, type, previewUrl: URL.createObjectURL(blob) },
      }));
    } catch {
      setError(t("report.photoError"));
    }
  }

  function captureGps() {
    if (!("geolocation" in navigator)) {
      setGpsState("error");
      return;
    }
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          gps: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }));
        setGpsState("idle");
      },
      () => setGpsState("error"),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const id = crypto.randomUUID(); // Anchor B: client id = idempotency key
      const payload: ReportPayload = {
        reporter_id: profile.id,
        animal_id: form.animalId,
        species: form.species,
        symptoms: form.symptoms,
        free_text: form.freeText.trim() || null,
        sick_count: form.sickCount,
        dead_count: form.deadCount,
        geo: form.gps ? `SRID=4326;POINT(${form.gps.lng} ${form.gps.lat})` : null,
        village: form.village.trim() || null,
        taluka: form.taluka.trim() || null,
        district: form.district.trim() || null,
        status: "pending",
        offline_ts: new Date().toISOString(),
      };

      // 1. Always persist locally first — crash/offline safe.
      await localDb.pendingReports.add({
        id,
        payload,
        photo: form.photo?.blob ?? null,
        photoType: form.photo?.type ?? null,
        createdAt: Date.now(),
        attempts: 0,
      });

      // 2. Try to sync now; if it stays queued we're offline (or failing).
      await syncPendingReports();
      const stillQueued = await localDb.pendingReports.get(id);
      setLastId(id);
      setTriage(null);
      setDone(stillQueued ? "queued" : "synced");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- done screen ---------- */
  if (done) {
    return (
      <div className="page-in mt-6 flex flex-col gap-4">
        <div className="card flex flex-col items-center gap-4 p-8 text-center">
          <span
            className={`grid h-14 w-14 place-items-center rounded-full text-2xl ${
              done === "synced" ? "bg-sage-soft" : "bg-[#FBF3DC]"
            }`}
          >
            {done === "synced" ? (
              <CheckIcon className="h-7 w-7 text-sage" />
            ) : (
              <ClockIcon className="h-7 w-7 text-[#8A6D1F]" />
            )}
          </span>
          <div className="font-serif text-xl font-semibold">
            {done === "synced" ? t("report.doneSynced") : t("report.doneQueued")}
          </div>
          <p className="lede">
            {done === "synced"
              ? t("report.doneSyncedBody")
              : t("report.doneQueuedBody")}
          </p>
          <div className="flex w-full flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-dark flex-1"
              onClick={() => {
                setDone(null);
                setTriage(null);
                setStep(0);
                setForm((f) => ({
                  ...f,
                  species: "",
                  symptoms: [],
                  freeText: "",
                  sickCount: 1,
                  deadCount: 0,
                  animalId: null,
                  photo: null,
                  gps: null,
                }));
              }}
            >
              {t("report.another")}
            </button>
            <Link href="/dashboard/triage" className="btn btn-line flex-1">
              {t("nav.triage")}
            </Link>
          </div>
        </div>

        {/* live triage result */}
        {done === "synced" &&
          (triage ? (
            <TriageCard
              candidates={triage.disease_candidates}
              urgency={triage.urgency}
              species={form.species || undefined}
            />
          ) : (
            <div className="card flex items-center gap-3 px-5 py-4 text-[13.5px] text-mut">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sage" />
              {t("triage.pendingResult")}
            </div>
          ))}
      </div>
    );
  }

  /* ---------- wizard ---------- */
  return (
    <div className="mt-6">
      {/* progress */}
      <div className="mb-5 flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full transition ${
              i <= step ? "bg-accent" : "bg-line"
            }`}
          />
        ))}
        <span className="ml-2 text-[11.5px] font-semibold text-mut">
          {t("report.stepOf", { current: step + 1, total: TOTAL_STEPS })}
        </span>
      </div>

      <div className="card page-in p-5 sm:p-7" key={step}>
        {step === 0 && (
          <>
            <StepTitle title={t("report.speciesTitle")} />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {SPECIES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, species: s.key, animalId: null }))
                  }
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                    form.species === s.key
                      ? "border-accent bg-[#F3E7DA]"
                      : "border-line bg-card hover:border-mut2"
                  }`}
                >
                  <span className={form.species === s.key ? "text-accent" : "text-ink-2"}>
                    <SpeciesIcon species={s.key} className="h-9 w-9" />
                  </span>
                  <span className="text-[12.5px] font-semibold">
                    {t(`species.${s.key}`)}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <StepTitle title={t("report.symptomsTitle")} />
            <div className="flex flex-col gap-5">
              {SYMPTOM_GROUPS.filter(
                (g) => g.group !== "poultry_signs" || form.species === "poultry"
              ).map((g) => (
                <div key={g.group}>
                  <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                    {t(`symptomGroups.${g.group}`)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.keys.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleSymptom(k)}
                        className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${
                          form.symptoms.includes(k)
                            ? "border-accent bg-accent text-white"
                            : "border-line bg-card text-ink-2 hover:border-mut2"
                        }`}
                      >
                        {t(`symptoms.${k}`)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <label className="field-label" htmlFor="freeText">
                  {t("report.freeTextLabel")}
                </label>
                <textarea
                  id="freeText"
                  rows={2}
                  className="field resize-none"
                  placeholder={t("report.freeTextHint")}
                  value={form.freeText}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, freeText: e.target.value }))
                  }
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <StepTitle title={t("report.countsTitle")} />
            <div className="flex flex-col gap-5">
              <Counter
                label={t("report.sick")}
                value={form.sickCount}
                min={0}
                onChange={(v) => setForm((f) => ({ ...f, sickCount: v }))}
              />
              <Counter
                label={t("report.dead")}
                value={form.deadCount}
                min={0}
                onChange={(v) => setForm((f) => ({ ...f, deadCount: v }))}
              />
              {speciesAnimals.length > 0 && (
                <div>
                  <label className="field-label" htmlFor="animal">
                    {t("report.linkAnimal")}
                  </label>
                  <select
                    id="animal"
                    className="field"
                    value={form.animalId ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        animalId: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">{t("report.noAnimal")}</option>
                    {speciesAnimals.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.tag_id
                          ? `${t("herd.tagShort")} ${a.tag_id}`
                          : `${t(`species.${a.species}`)}${a.breed ? ` · ${a.breed}` : ""}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <StepTitle title={t("report.photoTitle")} />
            <p className="lede mb-4 text-[13px]">{t("report.photoHint")}</p>
            {form.photo ? (
              <div className="flex flex-col gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.photo.previewUrl}
                  alt=""
                  className="max-h-64 w-full rounded-xl border border-line object-cover"
                />
                <button
                  type="button"
                  className="btn btn-line btn-sm self-start"
                  onClick={() => {
                    URL.revokeObjectURL(form.photo!.previewUrl);
                    setForm((f) => ({ ...f, photo: null }));
                  }}
                >
                  {t("report.removePhoto")}
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-line bg-paper/60 p-8 text-center transition hover:border-mut2">
                <span className="text-mut">
                  <CameraIcon className="h-9 w-9" />
                </span>
                <span className="text-[13.5px] font-semibold">
                  {t("report.addPhoto")}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onPhotoChange}
                />
              </label>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <StepTitle title={t("report.locationTitle")} />
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={captureGps}
                disabled={gpsState === "loading"}
                className={`btn ${form.gps ? "btn-line" : "btn-dark"}`}
              >
                {gpsState === "loading" ? (
                  t("common.working")
                ) : form.gps ? (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    {t("report.gpsCaptured")}
                  </>
                ) : (
                  <>
                    <PinIcon className="h-4 w-4" />
                    {t("report.useGps")}
                  </>
                )}
              </button>
              {gpsState === "error" && (
                <p className="rounded-lg bg-[#FBEDE7] px-3 py-2 text-[13px] text-accent">
                  {t("report.gpsError")}
                </p>
              )}
              <div className="grid grid-cols-3 gap-3 max-[420px]:grid-cols-1">
                <div>
                  <label className="field-label" htmlFor="village">
                    {t("auth.village")}
                  </label>
                  <input
                    id="village"
                    className="field"
                    value={form.village}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, village: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="taluka">
                    {t("auth.taluka")}
                  </label>
                  <input
                    id="taluka"
                    className="field"
                    value={form.taluka}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, taluka: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="district">
                    {t("auth.district")}
                  </label>
                  <input
                    id="district"
                    className="field"
                    value={form.district}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, district: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* review summary */}
              <div className="rounded-xl border border-line-2 bg-paper/60 p-4">
                <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
                  {t("report.review")}
                </div>
                <div className="flex flex-col gap-1 text-[13.5px]">
                  <span>
                    <b>{form.species && t(`species.${form.species}`)}</b>
                    {" · "}
                    {t("report.sick")} {form.sickCount} · {t("report.dead")}{" "}
                    {form.deadCount}
                  </span>
                  {form.symptoms.length > 0 && (
                    <span className="text-mut">
                      {form.symptoms.map((s) => t(`symptoms.${s}`)).join(", ")}
                    </span>
                  )}
                  {form.freeText && (
                    <span className="text-mut italic">“{form.freeText}”</span>
                  )}
                  <span className="text-mut">
                    {[form.village, form.taluka, form.district]
                      .filter(Boolean)
                      .join(", ")}
                    {form.gps ? ` · ${t("report.gpsCaptured")}` : ""}
                    {form.photo ? ` · ${t("report.photoAttached")}` : ""}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-[#FBEDE7] px-3 py-2 text-[13px] text-accent">
            {error}
          </p>
        )}

        {/* nav */}
        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button
              type="button"
              className="btn btn-line"
              onClick={() => setStep((s) => (s - 1) as Step)}
            >
              {t("common.back")}
            </button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              className="btn btn-dark flex-1"
              disabled={!canNext}
              style={{ opacity: canNext ? 1 : 0.45 }}
              onClick={() => canNext && setStep((s) => (s + 1) as Step)}
            >
              {t("common.next")}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-dark flex-1"
              disabled={!canNext || submitting}
              style={{ opacity: canNext && !submitting ? 1 : 0.45 }}
              onClick={submit}
            >
              {submitting ? t("common.working") : t("report.submit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepTitle({ title }: { title: string }) {
  return (
    <h2 className="mb-4 font-serif text-lg font-semibold tracking-tight">
      {title}
    </h2>
  );
}

function Counter({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line p-3.5">
      <span className="text-[14px] font-semibold">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={`${label} −1`}
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg font-bold transition hover:border-ink disabled:opacity-30"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className="w-8 text-center font-mono text-lg font-bold">
          {value}
        </span>
        <button
          type="button"
          aria-label={`${label} +1`}
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg font-bold transition hover:border-ink"
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
