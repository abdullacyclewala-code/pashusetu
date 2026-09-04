"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { WhatsAppIcon, FlaskIcon, PinIcon, InfoIcon } from "@/components/icons";
import type { ChannelMessageRow } from "@/lib/channel/types";
import type { VillageRow } from "@/lib/channel/parser";

interface LiveReport {
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
    { text: "cattle fever mouth blisters drooling 2 sick 1 dead Shirur", label: "FMD · cattle · en" },
    { text: "buffalo skin nodules fever 3 sick Shirur", label: "LSD · buffalo · en" },
    { text: "poultry respiratory distress cough 4 dead Shirur", label: "ND · poultry · en" },
  ],
  hi: [
    { text: "भैंस ताप मुंह में छाले लार 2 बीमार 1 मरे Shirur", label: "खुरपका · भैंस · हिं" },
    { text: "गाय त्वचा पर गांठ बुखार 3 बीमार Shirur", label: "लम्पी · गाय · हिं" },
  ],
  mr: [
    { text: "गाय ताप तोंडात फोड लाळ 2 आजारी 1 मेले Shirur", label: "लाळ्या खुरकूत · गाय · मरा" },
    { text: "म्हैस त्वचेवर गाठ ताप 3 आजारी Shirur", label: "लम्पी · म्हैस · मरा" },
  ],
};

const SPECIES_BTNS = ["cattle", "buffalo", "goat", "sheep", "pig", "poultry"] as const;
const SYMPTOM_BTNS = ["fever", "mouth_blisters", "drooling", "lameness", "skin_nodules", "milk_drop", "behaviour_change"] as const;
const COUNT_BTNS = ["2 sick 1 dead", "1 dead", "3 sick", "1 sick"] as const;

export function WhatsAppClient({
  villages,
  initialMessages,
  schemaReady,
  initialReports,
}: {
  villages: VillageRow[];
  initialMessages: ChannelMessageRow[];
  schemaReady: boolean;
  initialReports: LiveReport[];
}) {
  const t = useTranslations("whatsapp");
  const ts = useTranslations("species");
  const tSym = useTranslations("symptoms");
  const locale = useLocale();

  const supabase = useMemo(() => createClient(), []);

  const [phone, setPhone] = useState("+919004553021");
  const [village, setVillage] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatBubble[]>([]);
  const [parsed, setParsed] = useState<ParsedDraft | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [inbox, setInbox] = useState<ChannelMessageRow[]>(initialMessages);
  const [liveReports, setLiveReports] = useState<LiveReport[]>(initialReports);

  const sampleSet = SAMPLES[locale] ?? SAMPLES.en;

  function nowLabel() {
    return new Intl.DateTimeFormat(locale === "en" ? "en-IN" : locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  }

  function pushUser(message: string) {
    setChat((c) => [...c, { id: crypto.randomUUID(), from: "user", text: message, time: nowLabel() }]);
  }
  function pushBot(message: string) {
    setChat((c) => [...c, { id: crypto.randomUUID(), from: "bot", text: message, time: nowLabel() }]);
  }

  async function refresh() {
    const [msgs, reports] = await Promise.all([
      supabase.from("channel_messages").select("id, channel, direction, phone, message_type, text, reply_text, report_id, district, created_at").order("created_at", { ascending: false }).limit(40),
      supabase.from("reports").select("id, species, sick_count, dead_count, district, status, created_at, triage_results(disease_candidates, urgency)").order("created_at", { ascending: false }).limit(6),
    ]);
    if (!msgs.error) setInbox((msgs.data ?? []) as unknown as ChannelMessageRow[]);
    if (!reports.error) setLiveReports((reports.data ?? []) as unknown as LiveReport[]);
  }

  async function send(message: string) {
    const m = (message ?? "").trim();
    if (!m || busy) return;
    let body = m;
    // Ensure the selected village is present so it maps to a district the officer can see.
    if (village && !body.toLowerCase().includes(village.toLowerCase())) {
      body = `${body} ${village}`;
    }
    pushUser(body);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, text: body, messageType: "text", channel: "whatsapp" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`);
      } else {
        if (json.reply) pushBot(json.reply);
        setReply(json.reply ?? null);
        setParsed(json.draft ?? null);
        if (json.note) setError(json.note);
        await refresh();
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

  const parsedSymptoms = parsed?.symptoms ?? [];

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* ── simulator / chat ─────────────────────────────── */}
      <div className="card lg:col-span-2">
        <div className="card-head">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sage-soft text-sage">
              <WhatsAppIcon className="h-5 w-5" />
            </span>
            <div>
              <h3>{t("simTitle")}</h3>
              <p className="text-[12px] text-mut">{t("simHint")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-line-2 bg-paper/50 px-4 py-3">
          <div className="min-w-[150px] flex-1">
            <label className="field-label" htmlFor="wa-phone">{t("phoneLabel")}</label>
            <input id="wa-phone" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="min-w-[150px] flex-1">
            <label className="field-label" htmlFor="wa-village">{t("villageLabel")}</label>
            <select id="wa-village" className="field" value={village} onChange={(e) => setVillage(e.target.value)}>
              <option value="">{t("none")}</option>
              {villages.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} · {v.district}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* composer buttons (guided) */}
        <div className="flex flex-wrap gap-1.5 border-b border-line-2 px-4 py-3">
          {SPECIES_BTNS.map((s) => (
            <button key={s} type="button" className="chip cursor-pointer hover:border-accent" onClick={() => appendToText(s)}>
              {ts(s)}
            </button>
          ))}
          <span className="mx-1 w-px bg-line-2" />
          {SYMPTOM_BTNS.map((s) => (
            <button key={s} type="button" className="chip cursor-pointer hover:border-accent" onClick={() => appendToText(s.replace(/_/g, " "))}>
              {tSym(s)}
            </button>
          ))}
          <span className="mx-1 w-px bg-line-2" />
          {COUNT_BTNS.map((c) => (
            <button key={c} type="button" className="chip cursor-pointer hover:border-accent" onClick={() => appendToText(c)}>
              {c}
            </button>
          ))}
        </div>

        {/* sample messages */}
        <div className="flex flex-wrap gap-1.5 border-b border-line-2 bg-paper/40 px-4 py-3">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.1em] text-mut2">{t("sampleTitle")}</span>
          {sampleSet.map((s) => (
            <button key={s.label} type="button" className="chip cursor-pointer hover:border-accent" onClick={() => setText(s.text)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* chat window */}
        <div className="flex h-[340px] flex-col gap-2.5 overflow-y-auto bg-[#efe9e2]/40 px-4 py-4">
          {chat.length === 0 && (
            <div className="m-auto max-w-[300px] rounded-2xl border border-line bg-paper px-4 py-3 text-center text-[12.5px] text-mut">
              {t("notParsed")}
            </div>
          )}
          {chat.map((b) => (
            <div key={b.id} className={`flex ${b.from === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-[var(--shadow-card)] ${
                  b.from === "user" ? "rounded-br-sm bg-ink text-paper" : "rounded-bl-sm border border-line bg-card text-ink"
                }`}
              >
                <div className="whitespace-pre-wrap">{b.text}</div>
                <div className={`mt-1 text-right text-[10px] ${b.from === "user" ? "text-paper/60" : "text-mut2"}`}>{b.time}</div>
              </div>
            </div>
          ))}
          {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-sm border border-line bg-card px-3.5 py-2 text-[12.5px] text-mut">…</div></div>}
        </div>

        {/* composer */}
        <div className="flex items-center gap-2 border-t border-line-2 bg-paper/70 px-4 py-3">
          <input
            data-testid="wa-text"
            className="field flex-1"
            placeholder={t("textPlaceholder")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(text); setText(""); } }}
          />
          <button
            data-testid="wa-send"
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => { send(text); setText(""); }}
            className="btn btn-dark shrink-0 disabled:opacity-50"
          >
            {t("send")}
          </button>
        </div>

        {error && <div data-testid="wa-error" className="mx-4 mb-3 rounded-xl bg-[#F9E3DB] px-4 py-2.5 text-[13px] font-semibold text-accent">{error}</div>}
        <div className="flex items-start gap-1.5 border-t border-line-2 px-4 py-2.5 text-[11px] leading-relaxed text-mut">
          <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("webhookNote")} {t("poweredBy")}</span>
        </div>
      </div>

      {/* ── right: what we understood + live reports ─────── */}
      <div className="flex flex-col gap-4">
        <div className="card">
          <div className="card-head">
            <h3>{t("parsedTitle")}</h3>
          </div>
          <div className="space-y-3 px-5 py-4 text-[13px]">
            <Row label={t("species")} value={parsed?.species ? ts(parsed.species) : t("none")} testid="wa-species" />
            <Row label={t("symptoms")} value={parsedSymptoms.length ? parsedSymptoms.map((s) => tSym(s)).join(", ") : t("none")} />
            <Row label={t("counts")} value={parsed ? `${parsed.sickCount} / ${parsed.deadCount}` : t("none")} testid="wa-counts" />
            <Row label={t("location")} value={parsed?.village ? `${parsed.village}${parsed.district ? ` · ${parsed.district}` : ""}` : t("none")} />
            {parsed && parsed.unclear && parsed.unclear.length > 0 && (
              <Row label={t("unclear")} value={parsed.unclear.slice(0, 4).join(", ")} />
            )}
            <div className="rounded-xl border border-line-2 bg-paper/60 px-3 py-2.5">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">{t("replyTitle")}</div>
              <div data-testid="wa-reply" className="mt-1 whitespace-pre-wrap text-[13px] text-ink-2">{reply ?? t("notParsed")}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>{t("liveTitle")}</h3>
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
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper text-ink-2">
                      <FlaskIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-semibold text-ink">
                        {ts(r.species)}
                        {disease && <span className="chip">{disease}</span>}
                      </div>
                      <div className="text-[11px] text-mut">
                        {r.sick_count} {t("counts")} · {r.district ?? "—"}
                      </div>
                    </div>
                    <span className="text-[10.5px] text-mut2">{new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(r.created_at))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── inbox ─────────────────────────────────────────── */}
      <div className="card lg:col-span-3">
        <div className="card-head">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
              <PinIcon className="h-4 w-4" />
            </span>
            <div>
              <h3>{t("inboxTitle")}</h3>
              <p className="text-[12px] text-mut">{t("inboxHint")}</p>
            </div>
          </div>
        </div>
        {!schemaReady ? (
          <p className="px-5 py-4 text-[12.5px] text-mut">{t("inboxEmpty")} · {t("guidanceHint")}</p>
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
    </div>
  );
}

function Row({ label, value, testid }: { label: string; value: string; testid?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-mut2">{label}</span>
      <span data-testid={testid} className="text-right text-[13px] text-ink-2">{value}</span>
    </div>
  );
}
