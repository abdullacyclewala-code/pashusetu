"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { WhatsAppIcon, FlaskIcon, PinIcon, InfoIcon, ArrowRightIcon } from "@/components/icons";
import type { ChannelMessageRow } from "@/lib/channel/types";
import type { VillageRow } from "@/lib/channel/parser";

export interface LiveReport {
  id: string;
  species: string;
  sick_count: number;
  dead_count: number;
  district: string | null;
  status: string;
  created_at: string;
  triage_results: Array<{
    disease_candidates: Array<{ code: string; name_en: string; name_hi: string | null; name_mr: string | null }>;
    urgency: string;
  }>;
}

export interface FarmerReport {
  id: string;
  species: string;
  symptoms: string[];
  sick_count: number;
  dead_count: number;
  village: string | null;
  district: string | null;
  source: string;
  status: string;
  created_at: string;
  triage_results?: Array<{
    disease_candidates: Array<{ code: string; name_en: string; name_hi: string | null; name_mr: string | null }>;
    urgency: string;
  }>;
}

interface ChatBubble {
  id: string;
  from: "user" | "bot";
  text: string;
  time: string;
}

interface ParsedDraft {
  species?: string | null;
  symptoms?: string[];
  sickCount?: number;
  deadCount?: number;
  village?: string | null;
  district?: string | null;
  unclear?: string[];
}

const SAMPLES: Record<string, { text: string; label: string }[]> = {
  en: [
    { text: "cattle fever mouth blisters drooling 2 sick 1 dead Shirur", label: "Cattle · fever · mouth blisters" },
    { text: "buffalo skin nodules fever 3 sick Shirur", label: "Buffalo · skin nodules" },
    { text: "poultry respiratory distress cough 4 dead Shirur", label: "Poultry · respiratory" },
  ],
  hi: [
    { text: "भैंस ताप मुंह में छाले लार 2 बीमार 1 मरे Shirur", label: "भैंस · ताप · मुंह में छाले" },
    { text: "गाय त्वचा पर गांठ बुखार 3 बीमार Shirur", label: "गाय · त्वचा पर गांठ" },
  ],
  mr: [
    { text: "गाय ताप तोंडात फोड लाळ 2 आजारी 1 मेले Shirur", label: "गाय · ताप · तोंडात फोड" },
    { text: "म्हैस त्वचेवर गाठ ताप 3 आजारी Shirur", label: "म्हैस · त्वचेवर गाठ" },
  ],
};

const SPECIES_BTNS = ["cattle", "buffalo", "goat", "sheep", "pig", "poultry"] as const;
const COUNT_BTNS = ["2 sick 1 dead", "1 dead", "3 sick", "1 sick"] as const;

/** Dispatch: farmers get the in-app WhatsApp demo; officials get the receiving monitor only. */
export function WhatsAppClient(props: {
  view: "farmer" | "official";
  villages: VillageRow[];
  initialMessages: ChannelMessageRow[];
  schemaReady: boolean;
  initialReports: LiveReport[];
  farmerReports: FarmerReport[];
  whatsappNumber: string;
  farmerPhone: string | null;
}) {
  if (props.view === "farmer") return <FarmerWhatsApp {...props} />;
  return <OfficerWhatsApp {...props} />;
}

/* ───────────────────────────────────────────────────────────────────────────
   FARMER VIEW — an honest, in-app WhatsApp demo.
   The farmer types/taps a message → a bot bubble replies with the advisory →
   a real report is created (which the officer sees on the case/inbox side).
   A separate, clearly-labelled "In real WhatsApp" card shows the actual
   number + Open WhatsApp path (manual for now). Everything below is clearly
   marked a SIMULATION so nobody mistakes it for live WhatsApp automation.
   ─────────────────────────────────────────────────────────────────────────── */
function FarmerWhatsApp({
  farmerReports,
  whatsappNumber,
  farmerPhone,
}: {
  villages: VillageRow[];
  initialMessages: ChannelMessageRow[];
  schemaReady: boolean;
  initialReports: LiveReport[];
  farmerReports: FarmerReport[];
  whatsappNumber: string;
  farmerPhone: string | null;
}) {
  const t = useTranslations("whatsapp");
  const ts = useTranslations("species");
  const tSym = useTranslations("symptoms");
  const locale = useLocale();

  const waDigits = whatsappNumber.replace(/[^\d]/g, "");
  const waLink = (prefill: string) => `https://wa.me/${waDigits}?text=${encodeURIComponent(prefill)}`;
  const sampleSet = SAMPLES[locale] ?? SAMPLES.en;

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* ── SIMULATION — the farmer's actual demo experience ────────────── */}
      <SimulatorCard
        phone={farmerPhone ?? whatsappNumber}
        className="lg:col-span-2"
        badge={t("demoBadge")}
      />

      {/* ── side column: real WhatsApp + my reports ─────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="card">
          <div className="card-head">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-sage-soft text-sage">
                <WhatsAppIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-[13px]">{t("realWhatsappTitle")}</h3>
                <p className="text-[12px] text-mut">{t("realWhatsappSub")}</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="rounded-2xl border border-line-2 bg-paper/60 p-4 text-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-mut2">{t("numberLabel")}</div>
              <div className="font-mono text-xl font-bold tracking-tight text-ink">{whatsappNumber}</div>
              <a href={waLink(sampleSet[0]?.text ?? "")} target="_blank" rel="noopener noreferrer"
                className="btn btn-dark mt-3 inline-flex w-full items-center justify-center gap-1.5">
                <WhatsAppIcon className="h-4 w-4" />
                {t("openWhatsapp")}
              </a>
            </div>
            <div className="mt-3 space-y-2">
              {[t("how1"), t("how2"), t("how3")].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">{i + 1}</span>
                  <span className="text-[12.5px] leading-relaxed text-ink-2">{step}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-mut">
              <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t("realWhatsappNote")}</span>
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>{t("yourReportsTitle")}</h3></div>
          {farmerReports.length === 0 ? (
            <p className="px-5 py-4 text-[12.5px] text-mut">{t("yourReportsEmpty")}</p>
          ) : (
            <ul className="divide-y divide-line-2">
              {farmerReports.map((r) => {
                const cand = r.triage_results?.[0]?.disease_candidates?.[0];
                const disease = cand ? (cand[`name_${locale}` as keyof typeof cand] ?? cand.name_en) : null;
                return (
                  <li key={r.id} className="flex items-start gap-3 px-5 py-3 text-[12.5px]">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-ink-2"><FlaskIcon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                        {ts(r.species)}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.source === "whatsapp" ? "bg-sage-soft text-sage" : "bg-paper text-mut"}`}>
                          {r.source === "whatsapp" ? t("sourceWhatsapp") : t("sourceApp")}
                        </span>
                      </div>
                      {r.symptoms?.length > 0 && (
                        <div className="text-[11px] text-mut">{r.symptoms.slice(0, 3).map((s) => tSym(s)).join(", ")}</div>
                      )}
                      <div className="text-[11px] text-mut">{r.sick_count}/{r.dead_count} · {r.village ?? r.district ?? "—"}</div>
                      {disease && <div className="text-[11px] font-semibold text-accent">{t("disease")}: {disease}</div>}
                    </div>
                    <span className="shrink-0 text-[10.5px] text-mut2">{fmtDate(r.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── footer disclaimer ───────────────────────────────────────────── */}
      <div className="flex items-start gap-1.5 border-t border-line-2 px-5 py-3 text-[11px] leading-relaxed text-mut lg:col-span-3">
        <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{t("disclaimer")}</span>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   SIMULATOR — the shared in-app demo used by the farmer. Type/tap a message,
   get the advisory reply in a chat bubble; the message also creates a real
   report so an officer sees it. Never sends anything to real WhatsApp.
   ─────────────────────────────────────────────────────────────────────────── */
function SimulatorCard({ phone, className, badge }: { phone: string; className?: string; badge: string }) {
  const t = useTranslations("whatsapp");
  const ts = useTranslations("species");
  const tSym = useTranslations("symptoms");
  const locale = useLocale();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatBubble[]>([]);
  const [parsed, setParsed] = useState<ParsedDraft | null>(null);
  const [reply, setReply] = useState<string | null>(null);

  const sampleSet = SAMPLES[locale] ?? SAMPLES.en;
  const parsedSymptoms = parsed?.symptoms ?? [];

  function nowLabel() {
    return new Intl.DateTimeFormat(locale === "en" ? "en-IN" : locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  }
  function push(message: string, from: "user" | "bot") {
    setChat((c) => [...c, { id: crypto.randomUUID(), from, text: message, time: nowLabel() }]);
  }
  async function send(message: string) {
    const m = (message ?? "").trim();
    if (!m || busy) return;
    push(m, "user");
    setText("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, text: m, messageType: "text", channel: "whatsapp" }),
      });
      const json = await res.json();
      if (!res.ok) setError(json?.error ?? `HTTP ${res.status}`);
      else {
        if (json.reply) push(json.reply, "bot");
        setReply(json.reply ?? null);
        setParsed(json.draft ?? null);
        if (json.note) setError(json.note);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function appendToText(part: string) {
    setText((cur) => (cur ? `${cur} ${part}` : part));
  }

  return (
    <div className={`card ${className ?? ""}`}>
      <div className="card-head">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sage-soft text-sage">
            <WhatsAppIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-[13px]">{t("simTitle")}</h3>
            <p className="text-[12px] text-mut">{t("simHint")}</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-accent">
            <InfoIcon className="h-3 w-3" />
            {badge}
          </span>
        </div>
      </div>

      {/* chat */}
      <div className="flex h-[320px] flex-col gap-2.5 overflow-y-auto bg-[#efe9e2]/40 px-4 py-4">
        {chat.length === 0 && (
          <div className="m-auto max-w-[320px] rounded-2xl border border-dashed border-line-2 bg-paper px-4 py-3 text-center text-[12.5px] text-mut">
            {t("tryHint")}
          </div>
        )}
        {chat.map((b) => (
          <div key={b.id} className={`flex ${b.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-[var(--shadow-card)] ${b.from === "user" ? "rounded-br-sm bg-ink text-paper" : "rounded-bl-sm border border-line bg-card text-ink"}`}>
              <div className="whitespace-pre-wrap">{b.text}</div>
              <div className={`mt-1 text-right text-[10px] ${b.from === "user" ? "text-paper/60" : "text-mut2"}`}>{b.time}</div>
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm border border-line bg-card px-3.5 py-2 text-[12.5px] text-mut">…</div></div>}
      </div>

      {/* quick-fill chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-line-2 bg-paper/40 px-4 py-3">
        <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.1em] text-mut2">{t("sampleTitle")}</span>
        {sampleSet.map((s) => (
          <button key={s.label} type="button" className="chip cursor-pointer hover:border-accent" onClick={() => setText(s.text)}>{s.label}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 border-b border-line-2 px-4 py-2.5">
        {SPECIES_BTNS.slice(0, 4).map((s) => (
          <button key={s} type="button" className="chip cursor-pointer hover:border-accent" onClick={() => appendToText(s)}>{ts(s)}</button>
        ))}
        <span className="mx-1 w-px bg-line-2" />
        {COUNT_BTNS.map((c) => (
          <button key={c} type="button" className="chip cursor-pointer hover:border-accent" onClick={() => appendToText(c)}>{c}</button>
        ))}
      </div>

      {/* input */}
      <div className="flex items-center gap-2 border-t border-line-2 bg-paper/70 px-4 py-3">
        <input data-testid="wa-text" className="field flex-1" placeholder={t("textPlaceholder")} value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(text); } }} />
        <button data-testid="wa-send" type="button" disabled={busy || !text.trim()} onClick={() => send(text)}
          className="btn btn-dark inline-flex shrink-0 items-center gap-1.5 disabled:opacity-50">
          <ArrowRightIcon className="h-4 w-4" />
          {t("send")}
        </button>
      </div>

      {/* parsed understanding + reply */}
      <div className="border-t border-line-2 px-5 py-4">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-mut2">{t("parsedTitle")}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-4">
          <Field label={t("species")} value={parsed?.species ? ts(parsed.species) : t("none")} testid="wa-species" muted={!parsed} />
          <Field label={t("symptoms")} value={parsedSymptoms.length ? parsedSymptoms.map((s) => tSym(s)).join(", ") : t("none")} muted={!parsed} />
          <Field label={t("counts")} value={parsed ? `${parsed.sickCount} / ${parsed.deadCount}` : t("none")} testid="wa-counts" muted={!parsed} />
          <Field label={t("location")} value={parsed?.village ? `${parsed.village}${parsed.district ? ` · ${parsed.district}` : ""}` : t("none")} muted={!parsed} />
        </div>
        <div className="mt-3 rounded-xl border border-line-2 bg-paper/60 px-3 py-2.5">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">{t("replyTitle")}</div>
          <div data-testid="wa-reply" className="mt-1 whitespace-pre-wrap text-[13px] text-ink-2">{reply ?? t("notParsed")}</div>
        </div>
      </div>

      {error && <div className="mx-4 mb-3 rounded-xl bg-[#F9E3DB] px-4 py-2.5 text-[13px] font-semibold text-accent">{error}</div>}
      <div className="flex items-start gap-1.5 border-t border-line-2 px-4 py-2.5 text-[11px] leading-relaxed text-mut">
        <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{t("simNote")}</span>
      </div>
    </div>
  );
}

function Field({ label, value, testid, muted }: { label: string; value: string; testid?: string; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-mut2">{label}</div>
      <div data-testid={testid} className={`truncate text-[12.5px] ${muted ? "text-mut2" : "text-ink"}`}>{value}</div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   OFFICER VIEW — receiving end only. A clean monitor of the WhatsApp channel:
   the created reports and the inbound/outbound messages. No simulator here.
   ─────────────────────────────────────────────────────────────────────────── */
function OfficerWhatsApp({
  initialMessages,
  schemaReady,
  initialReports,
}: {
  villages: VillageRow[];
  initialMessages: ChannelMessageRow[];
  schemaReady: boolean;
  initialReports: LiveReport[];
  farmerReports: FarmerReport[];
  whatsappNumber: string;
  farmerPhone: string | null;
}) {
  const t = useTranslations("whatsapp");
  const ts = useTranslations("species");
  const locale = useLocale();

  const [inbox] = useState<ChannelMessageRow[]>(initialMessages);
  const [liveReports] = useState<LiveReport[]>(initialReports);

  return (
    <div className="mt-6 grid grid-cols-1 gap-4">
      {/* received reports */}
      <div className="card">
        <div className="card-head">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent"><FlaskIcon className="h-4 w-4" /></span>
            <div>
              <h3>{t("liveTitle")}</h3>
              <p className="text-[12px] text-mut">{t("liveHint")}</p>
            </div>
          </div>
        </div>
        {liveReports.length === 0 ? (
          <p className="px-5 py-4 text-[12.5px] text-mut">{t("notParsed")}</p>
        ) : (
          <ul className="divide-y divide-line-2">
            {liveReports.map((r) => {
              const cand = r.triage_results?.[0]?.disease_candidates?.[0];
              const disease = cand ? (cand[`name_${locale}` as keyof typeof cand] ?? cand.name_en) : null;
              return (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-[12.5px]">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-ink-2"><FlaskIcon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      {ts(r.species)}
                      {disease && <span className="chip">{disease}</span>}
                    </div>
                    <div className="text-[11px] text-mut">{r.sick_count} {t("counts")} · {r.district ?? "—"}</div>
                  </div>
                  <span className="text-[10.5px] text-mut2">{new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(r.created_at))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* the messages the officer would have received */}
      <div className="card">
        <div className="card-head">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent"><PinIcon className="h-4 w-4" /></span>
            <div>
              <h3>{t("inboxTitle")}</h3>
              <p className="text-[12px] text-mut">{t("inboxHint")}</p>
            </div>
          </div>
        </div>
        {!schemaReady ? (
          <p className="px-5 py-4 text-[12.5px] text-mut">{t("inboxEmpty")}</p>
        ) : inbox.length === 0 ? (
          <p className="px-5 py-4 text-[12.5px] text-mut">{t("inboxEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line-2 text-[11px] uppercase tracking-[0.08em] text-mut2">
                  <th className="px-5 py-2.5 font-semibold">{t("phone")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("message")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("district")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("reportId")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-2">
                {inbox.slice(0, 24).map((m) => (
                  <tr key={m.id}>
                    <td className="px-5 py-3 font-semibold text-ink">
                      <span className={`mr-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${m.direction === "inbound" ? "bg-sage-soft text-sage" : "bg-paper text-mut"}`}>
                        {m.direction === "inbound" ? t("inbound") : t("outbound")}
                      </span>
                      {m.phone}
                    </td>
                    <td className="max-w-[420px] px-3 py-3 text-ink-2">
                      <div className="line-clamp-2 whitespace-pre-wrap">{m.text ?? m.reply_text ?? "—"}</div>
                    </td>
                    <td className="px-3 py-3 text-mut">{m.district ?? "—"}</td>
                    <td className="px-3 py-3 text-mut2">{m.report_id ? m.report_id.slice(0, 8) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-1.5 border-t border-line-2 px-5 py-3 text-[11px] leading-relaxed text-mut">
        <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{t("disclaimer")} {t("simNote")}</span>
      </div>
    </div>
  );
}
