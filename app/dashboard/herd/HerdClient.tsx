"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { SPECIES } from "@/lib/report/constants";
import { HerdIcon } from "@/components/icons";

export interface Animal {
  id: string;
  species: string;
  tag_id: string | null;
  breed: string | null;
  dob: string | null;
  created_at: string;
}

const EMPTY_FORM = { species: "cattle", tag_id: "", breed: "", dob: "" };

export function HerdClient({
  initialAnimals,
  ownerId,
}: {
  initialAnimals: Animal[];
  ownerId: string;
}) {
  const t = useTranslations();
  const [animals, setAnimals] = useState<Animal[]>(initialAnimals);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
    setConfirmDelete(null);
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
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
                    {s.emoji} {t(`species.${s.key}`)}
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
          {animals.map((a) => (
            <div key={a.id} className="card flex items-center gap-4 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sage-soft text-2xl">
                {SPECIES.find((s) => s.key === a.species)?.emoji ?? "🐾"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">
                  {t(`species.${a.species}`)}
                  {a.breed ? ` · ${a.breed}` : ""}
                </div>
                <div className="truncate font-mono text-[10.5px] uppercase tracking-[0.06em] text-mut">
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
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label={t("common.remove")}
                  className="shrink-0 rounded-lg px-2 py-1 font-mono text-[10px] uppercase text-mut2 transition hover:text-accent"
                  onClick={() => setConfirmDelete(a.id)}
                >
                  {t("common.remove")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
