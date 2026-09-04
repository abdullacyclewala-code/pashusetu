"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { SPECIES } from "@/lib/report/constants";
import { HerdIcon, ShieldCheckIcon, SyringeIcon, CheckIcon } from "@/components/icons";
import { SpeciesIcon } from "@/components/SpeciesIcon";

export interface Animal {
  id: string;
  species: string;
  tag_id: string | null;
  breed: string | null;
  dob: string | null;
  created_at: string;
}

export interface Vaccination {
  id: string;
  animal_id: string;
  vaccine: string;
  dose_no: number;
  date: string;
  administered_by: string | null;
  campaign: string | null;
}

export interface CoverageRow {
  district: string;
  vaccine: string;
  animals: number;
  vaccinated: number;
  coverage: number;
}

const EMPTY_FORM = { species: "cattle", tag_id: "", breed: "", dob: "" };

/** Core vaccines by species — used to flag per-animal coverage gaps. */
const SPECIES_VACCINES: Record<string, string[]> = {
  cattle: ["FMD", "LSD", "HS"],
  buffalo: ["FMD", "LSD", "HS"],
  goat: ["PPR", "FMD", "HS"],
  sheep: ["PPR", "FMD", "HS"],
  pig: ["CSF"],
  poultry: ["ND"],
  other: ["FMD"],
};

/** Core vaccines to offer when recording a dose, keyed by species. */
function vaccineOptions(species: string): string[] {
  const set = new Set<string>(SPECIES_VACCINES[species] ?? ["FMD"]);
  for (const extra of ["FMD", "LSD", "HS", "PPR"]) set.add(extra);
  return Array.from(set);
}

export function HerdClient({
  initialAnimals,
  ownerId,
  initialVaccinations,
  coverage,
  district,
}: {
  initialAnimals: Animal[];
  ownerId: string;
  initialVaccinations: Vaccination[];
  coverage: CoverageRow[];
  district: string | null;
}) {
  const t = useTranslations();
  const format = useFormatter();
  const [animals, setAnimals] = useState<Animal[]>(initialAnimals);
  const [vaccinations, setVaccinations] =
    useState<Vaccination[]>(initialVaccinations);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // vaccination form (per active animal)
  const [vaccAnimal, setVaccAnimal] = useState<string | null>(null);
  const [vaccForm, setVaccForm] = useState({ vaccine: "FMD", dose_no: "1", date: "", administered_by: "" });
  const [savingVacc, setSavingVacc] = useState(false);

  const tagValid = form.tag_id === "" || /^\d{12}$/.test(form.tag_id);

  async function save() {
    if (!tagValid) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("animals")
      .insert({
        owner_id: ownerId,
        species: form.species,
        tag_id: form.tag_id || null,
        breed: form.breed.trim() || null,
        dob: form.dob || null,
      })
      .select("id, species, tag_id, breed, dob, created_at")
      .single<Animal>();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAnimals((a) => [data, ...a]);
    setForm(EMPTY_FORM);
    setAdding(false);
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("animals").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setAnimals((a) => a.filter((x) => x.id !== id));
    setVaccinations((v) => v.filter((x) => x.animal_id !== id));
    setConfirmDelete(null);
  }

  async function saveVaccination() {
    if (!vaccAnimal) return;
    if (!vaccForm.date) return;
    setSavingVacc(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .rpc("add_vaccination", {
        p_animal: vaccAnimal,
        p_vaccine: vaccForm.vaccine,
        p_dose_no: Number(vaccForm.dose_no || 1),
        p_date: vaccForm.date,
        p_administered_by: vaccForm.administered_by.trim() || null,
      })
      .single<Vaccination>();
    setSavingVacc(false);
    if (error) {
      setError(error.message);
      return;
    }
    setVaccinations((v) => [data as Vaccination, ...v]);
    setVaccAnimal(null);
    setVaccForm({ vaccine: "FMD", dose_no: "1", date: "", administered_by: "" });
  }

  const vaccFor = (animalId: string) =>
    vaccinations.filter((v) => v.animal_id === animalId);

  const gapFor = (species: string, animalId: string) => {
    const core = SPECIES_VACCINES[species] ?? [];
    const had = new Set(vaccFor(animalId).map((v) => v.vaccine));
    return core.filter((v) => !had.has(v));
  };

  const fmt = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium" });

  const vaccineLabel = (code: string) =>
    t.has(`herd.vaccine_${code}`) ? t(`herd.vaccine_${code}`) : code;

  return (
    <div className="mt-6 flex flex-col gap-4">
      {/* district coverage summary */}
      {coverage.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5 px-5 py-3.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-sage-soft text-sage">
              <ShieldCheckIcon className="h-4 w-4" />
            </span>
            <div>
              <div className="text-[14px] font-bold text-ink">
                {t("herd.coverageTitle")}
              </div>
              <div className="text-[11.5px] text-mut">
                {t("herd.coverageHint", { district: district ?? "—" })}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-line-2 px-5 py-4 sm:grid-cols-2">
            {coverage.map((c) => {
              const pct = Number(c.coverage ?? 0);
              const gap = 100 - pct;
              const color = pct >= 80 ? "#5E6E3E" : pct >= 50 ? "#8A6D1F" : "#A8431F";
              return (
                <div key={`${c.district}-${c.vaccine}`} className="rounded-2xl border border-line bg-paper/60 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-bold text-ink-2">
                      {vaccineLabel(c.vaccine)}
                    </span>
                    <span className="text-[11px] text-mut">
                      {t("herd.ofVaccinated", {
                        vaccinated: c.vaccinated,
                        animals: c.animals,
                      })}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
                    <span className="font-bold" style={{ color }}>
                      {pct}% {t("herd.vaccinated")}
                    </span>
                    {gap > 0 && (
                      <span className="rounded-full bg-[#FBE9DC] px-2 py-0.5 text-[10px] font-bold text-[#A85B1F]">
                        {t("herd.gap", { pct: Math.round(gap) })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* add button / form */}
      {adding ? (
        <div className="card page-in p-5 sm:p-6">
          <h2 className="mb-4 font-serif text-lg font-semibold">
            {t("herd.addAnimal")}
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="field-label" htmlFor="species">
                {t("report.speciesTitle")}
              </label>
              <select
                id="species"
                className="field"
                value={form.species}
                onChange={(e) =>
                  setForm((f) => ({ ...f, species: e.target.value }))
                }
              >
                {SPECIES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {t(`species.${s.key}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="tag">
                {t("herd.tagId")}
              </label>
              <input
                id="tag"
                className="field"
                inputMode="numeric"
                maxLength={12}
                placeholder={t("herd.tagHint")}
                value={form.tag_id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tag_id: e.target.value.replace(/\D/g, ""),
                  }))
                }
              />
              {!tagValid && (
                <p className="mt-1 text-[12px] text-accent">
                  {t("herd.tagInvalid")}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 max-[420px]:grid-cols-1">
              <div>
                <label className="field-label" htmlFor="breed">
                  {t("herd.breed")}
                </label>
                <input
                  id="breed"
                  className="field"
                  value={form.breed}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, breed: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="dob">
                  {t("herd.dob")}
                </label>
                <input
                  id="dob"
                  type="date"
                  className="field"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.dob}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dob: e.target.value }))
                  }
                />
              </div>
            </div>
            {error && (
              <p className="rounded-lg bg-[#FBEDE7] px-3 py-2 text-[13px] text-accent">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                className="btn btn-line"
                onClick={() => {
                  setAdding(false);
                  setError(null);
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-dark flex-1"
                disabled={saving || !tagValid}
                onClick={save}
              >
                {saving ? t("common.working") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-dark self-start"
          onClick={() => setAdding(true)}
        >
          + {t("herd.addAnimal")}
        </button>
      )}

      {/* list */}
      {animals.length === 0 && !adding ? (
        <div className="empty">
          <span className="e-ico">
            <HerdIcon />
          </span>
          <div className="e-t">{t("herd.emptyTitle")}</div>
          <div className="e-s">{t("herd.emptyBodyOwn")}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {animals.map((a) => {
            const vaccs = vaccFor(a.id);
            const gaps = gapFor(a.species, a.id);
            return (
              <div key={a.id} className="card flex flex-col p-4">
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sage-soft text-sage">
                    <SpeciesIcon species={a.species} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-semibold">
                        {t(`species.${a.species}`)}
                        {a.breed ? ` · ${a.breed}` : ""}
                      </span>
                      {gaps.length === 0 ? (
                        <span className="flex items-center gap-1 rounded-full bg-sage-soft px-2 py-0.5 text-[10px] font-bold text-sage">
                          <CheckIcon className="h-3 w-3" />
                          {t("herd.fullyVaccinated")}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-[#FBE9DC] px-2 py-0.5 text-[10px] font-bold text-[#A85B1F]">
                          {t("herd.gapBadge", { count: gaps.length })}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[12px] font-medium text-mut">
                      {a.tag_id
                        ? `${t("herd.tagShort")} ${a.tag_id}`
                        : t("herd.noTag")}
                      {a.dob ? ` · ${a.dob}` : ""}
                    </div>
                  </div>
                  {confirmDelete === a.id ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="btn btn-sm bg-accent text-white"
                        onClick={() => remove(a.id)}
                      >
                        {t("common.confirm")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-line btn-sm"
                        onClick={() => setConfirmDelete(null)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-3.5 w-3.5"><path d="M6 6l12 12M18 6L6 18"/></svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={t("common.remove")}
                      className="shrink-0 rounded-lg px-2 py-1 text-[11.5px] font-semibold text-mut2 transition hover:text-accent"
                      onClick={() => setConfirmDelete(a.id)}
                    >
                      {t("common.remove")}
                    </button>
                  )}
                </div>

                {/* vaccination history + gap list */}
                <div className="mt-3 border-t border-line-2 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-mut2">
                      <SyringeIcon className="h-3.5 w-3.5" />
                      {t("herd.vaccinationRecords")}
                    </span>
                    {vaccAnimal === a.id ? (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-mut"
                        onClick={() => {
                          setVaccAnimal(null);
                          setVaccForm({ vaccine: "FMD", dose_no: "1", date: "", administered_by: "" });
                        }}
                      >
                        {t("common.cancel")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-[11.5px] font-semibold text-accent"
                        onClick={() => {
                          setVaccAnimal(a.id);
                          setVaccForm({ vaccine: vaccineOptions(a.species)[0], dose_no: "1", date: "", administered_by: "" });
                        }}
                      >
                        + {t("herd.addVaccination")}
                      </button>
                    )}
                  </div>

                  {vaccAnimal === a.id && (
                    <div className="mt-2 flex flex-col gap-2 rounded-xl border border-line-2 bg-paper/60 p-3">
                      <div className="flex flex-wrap gap-2">
                        <select
                          className="field flex-1"
                          value={vaccForm.vaccine}
                          onChange={(e) =>
                            setVaccForm((f) => ({ ...f, vaccine: e.target.value }))
                          }
                        >
                          {vaccineOptions(a.species).map((v) => (
                            <option key={v} value={v}>
                              {vaccineLabel(v)}
                            </option>
                          ))}
                        </select>
                        <input
                          className="field w-20"
                          type="number"
                          min={1}
                          title={t("herd.dose")}
                          aria-label={t("herd.dose")}
                          value={vaccForm.dose_no}
                          onChange={(e) =>
                            setVaccForm((f) => ({ ...f, dose_no: e.target.value.replace(/\D/g, "") }))
                          }
                        />
                        <input
                          className="field flex-1"
                          type="date"
                          max={new Date().toISOString().slice(0, 10)}
                          value={vaccForm.date}
                          onChange={(e) =>
                            setVaccForm((f) => ({ ...f, date: e.target.value }))
                          }
                        />
                      </div>
                      <input
                        className="field"
                        placeholder={t("herd.administeredBy")}
                        value={vaccForm.administered_by}
                        onChange={(e) =>
                          setVaccForm((f) => ({ ...f, administered_by: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        disabled={savingVacc || !vaccForm.date}
                        onClick={saveVaccination}
                        className="btn btn-dark disabled:opacity-50"
                      >
                        {savingVacc ? t("common.working") : t("herd.saveDose")}
                      </button>
                    </div>
                  )}

                  {vaccs.length === 0 ? (
                    <div className="mt-2 rounded-xl bg-paper/70 px-3 py-2.5 text-[12px] text-mut">
                      {t("herd.noRecords")}
                    </div>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {vaccs.map((v) => (
                        <li key={v.id} className="flex items-center gap-2.5 rounded-xl bg-paper/70 px-3 py-2 text-[12px]">
                          <SyringeIcon className="h-3.5 w-3.5 shrink-0 text-sage" />
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-ink-2">
                              {vaccineLabel(v.vaccine)}
                            </span>
                            <span className="text-mut"> · {t("herd.dose")} {v.dose_no}</span>
                            {v.campaign && (
                              <span className="text-mut2"> · {v.campaign}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-mut">
                            {fmt(`${v.date}T00:00:00Z`)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {gaps.length > 0 && (
                    <div className="mt-2 rounded-xl bg-[#FBE9DC]/50 px-3 py-2.5">
                      <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#A85B1F]">
                        {t("herd.missingTitle")}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {gaps.map((g) => (
                          <span
                            key={g}
                            className="rounded-full bg-[#F9E3DB] px-2.5 py-1 text-[11px] font-semibold text-[#A8431F]"
                          >
                            {vaccineLabel(g)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
