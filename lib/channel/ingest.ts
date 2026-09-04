/**
 * PashuSetu · P7 — channel ingest core.
 *
 * THE SHARED PIPELINE. Both the WhatsApp webhook and the in-app simulator call
 * this one function, so a message from either path becomes an *ordinary*
 * `reports` row and flows through the existing triage → cluster → case pipeline
 * with zero special-casing. This is what makes the farmer channel real rather
 * than a demo bolt-on.
 *
 * Transport-agnostic: it takes a normalised `InboundMessage` and returns an
 * `IngestResult` (the reply to send, the report id, the draft we understood).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Channel,
  ChannelLocale,
  InboundMessage,
  IngestResult,
  ReportDraft,
  SessionDraft,
  SessionStep,
} from "./types";
import {
  detectLanguage,
  detectSpecies,
  detectSymptoms,
  parseFreeText,
  looksLikeReport,
  type VillageRow,
} from "./parser";
import { resolveFarmer, type FarmerProfile, normalizePhone } from "./farmer";
import {
  buildHelp,
  buildReportReply,
  buildClarify,
  CONFIRMED,
} from "./reply";
import type { Candidate, Urgency } from "@/lib/triage/types";

// Schema capability flags — detected once per process so the channel works
// before the migration is applied (stateless/fast-path) and unlocks the
// full session + inbox + source provenance afterwards.
let _caps: { reportsSource: boolean; channelLog: boolean; sessions: boolean } | null = null;
async function caps(supabase: SupabaseClient) {
  if (_caps) return _caps;
  _caps = { reportsSource: false, channelLog: false, sessions: false };

  const src = await supabase.from("reports").select("source").limit(1).maybeSingle();
  if (!src.error) _caps.reportsSource = true;

  const log = await supabase.from("channel_messages").select("id").limit(1).maybeSingle();
  if (!log.error) _caps.channelLog = true;

  const sess = await supabase.from("channel_sessions").select("phone").limit(1).maybeSingle();
  if (!sess.error) _caps.sessions = true;
  return _caps;
}

export interface IngestContext {
  supabase: SupabaseClient;
  channel: Channel;
}

/** Map an interactive button title / payload to a step action. */
function interactiveValue(int: NonNullable<InboundMessage["interactive"]>): string {
  if (int.payload) return int.payload;
  return int.title;
}

function ewkt(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

export async function ingestMessage(
  ctx: IngestContext,
  msg: InboundMessage
): Promise<IngestResult> {
  const { supabase, channel } = ctx;
  const c = await caps(supabase);
  const phone = normalizePhone(msg.phone);

  // 1) Load the reference geometry once.
  const { data: villages } = await supabase
    .from("villages")
    .select("name, taluka, district")
    .returns<VillageRow[]>();

  // 2) Resolve / provision the farmer. District/village hints come from the msg.
  const parsed = parseFreeText(msg.text ?? "", villages ?? []);
  const recv = msg.location ?? null;
  const vill = parsed.matchedVillage;

  const farmer = await resolveFarmer(supabase, phone, {
    district: vill?.district ?? null,
    village: vill?.name ?? null,
    taluka: vill?.taluka ?? null,
    languagePref: detectLanguage(msg.text ?? "", "en"),
  });

  const locale: ChannelLocale = (farmer.language_pref as ChannelLocale) || "en";
  const resolvedLocale: ChannelLocale =
    msg.text && /[\u0900-\u097F]/.test(msg.text)
      ? detectLanguage(msg.text, locale)
      : locale;

  // 3) Load conversation state (guided interactive flow).
  const state = await loadSession(supabase, c.sessions, phone);
  const draft: SessionDraft = state?.draft ?? { symptoms: [] };
  const step: SessionStep = state?.step ?? "idle";

  // 4) Forward a shared location into the draft.
  if (recv) {
    draft.geo = ewkt(recv.lng, recv.lat);
    let near: { name?: string; taluka?: string; district?: string } | null = null;
    try {
      const r = await supabase.rpc("nearest_village", { p_lat: recv.lat, p_lng: recv.lng });
      near = (r.data as { name?: string; taluka?: string; district?: string } | null) ?? null;
    } catch {
      near = null;
    }
    if (near?.name) {
      draft.village = near.name;
      draft.taluka = near.taluka;
      draft.district = near.district;
    }
  }

  // 5) Merge any free-text signals (species/symptoms/counts/location).
  const interactive = msg.interactive ?? null;
  const label = interactive ? interactiveValue(interactive) : msg.text ?? "";

  // If we're mid-conversation, fold the button/text into the draft.
  if (step !== "idle") {
    if (interactive || looksLikeReport(label)) {
      const sp = detectSpecies(label);
      if (sp) draft.species = sp;
      const syms = detectSymptoms(label);
      if (syms.length) draft.symptoms = Array.from(new Set([...(draft.symptoms ?? []), ...syms]));
    }
  }

  // 6) Decide what to do based on the flow.
  const species = (draft.species ?? parsed.species) as string | null;
  const symptoms = Array.from(new Set([...(draft.symptoms ?? []), ...(parsed.symptoms ?? [])]));
  const sickCount = draft.sickCount ?? parsed.sickCount ?? 1;
  const deadCount = draft.deadCount ?? parsed.deadCount ?? 0;
  const village = draft.village ?? parsed.village ?? farmer.village ?? null;
  const taluka = draft.taluka ?? parsed.taluka ?? farmer.taluka ?? null;
  const district = draft.district ?? parsed.district ?? farmer.district ?? null;
  const geoEwkt = (draft.geo as string | null) ?? (recv ? ewkt(recv.lng, recv.lat) : null);

  // Interactive transition: a fresh button tap on an idle session starts guided mode.
  if (interactive && step === "idle") {
    if (species) {
      draft.species = species;
      await saveSession(supabase, c.sessions, phone, channel, resolvedLocale, "species", draft);
      return {
        ok: true,
        reportId: null,
        nextStep: "symptoms",
        reply: buildClarify(resolvedLocale, "symptoms"),
        draft: null,
        completed: false,
      };
    }
    // "Report"/help path
    await saveSession(supabase, c.sessions, phone, channel, resolvedLocale, "species", draft);
    return {
      ok: true,
      reportId: null,
      nextStep: "species",
      reply: buildClarify(resolvedLocale, "species"),
      draft: null,
      completed: false,
    };
  }

  // Guided progression (only when we still don't have everything).
  if (step !== "idle" && !(species && symptoms.length)) {
    const nextStep: SessionStep = !species ? "species" : symptoms.length ? "counts" : "symptoms";
    await saveSession(supabase, c.sessions, phone, channel, resolvedLocale, nextStep, draft);
    return {
      ok: true,
      reportId: null,
      nextStep,
      reply: buildClarify(resolvedLocale, nextStep),
      draft: null,
      completed: false,
    };
  }

  // 7) Fast path / completion — we have enough to create a report.
  if (species && symptoms.length) {
    const draftForReport: ReportDraft = {
      species,
      symptoms,
      sickCount,
      deadCount,
      village,
      taluka,
      district,
      geoEwkt,
      freeText: msg.text ?? null,
      matchedVillage: vill
        ? { name: vill.name, taluka: vill.taluka, district: vill.district }
        : null,
      unclear: parsed.unclear,
    };

    const result = await createAndReply(ctx, {
      phone,
      locale: resolvedLocale,
      draft: draftForReport,
      farmer,
      rawText: msg.text ?? null,
      channel,
      canWriteSource: c.reportsSource,
      canLog: c.channelLog,
      canSession: c.sessions,
      inboundPayload: {
        message_type: msg.messageType,
        text: msg.text ?? null,
        interactive: msg.interactive ?? null,
        location: msg.location ?? null,
      },
    });

    await saveSession(
      supabase,
      c.sessions,
      phone,
      channel,
      resolvedLocale,
      null,
      {}
    );
    return result;
  }

  // 8) Not enough info yet — guide the farmer.
  const nextStep: SessionStep = !species ? "species" : symptoms.length ? "counts" : "symptoms";
  await saveSession(supabase, c.sessions, phone, channel, resolvedLocale, nextStep, draft);
  return {
    ok: true,
    reportId: null,
    nextStep,
    reply: buildClarify(resolvedLocale, nextStep, parsed.unclear),
    draft: null,
    completed: false,
  };
}

interface CreateArgs {
  phone: string;
  locale: ChannelLocale;
  draft: ReportDraft;
  farmer: FarmerProfile;
  rawText: string | null;
  channel: Channel;
  canWriteSource: boolean;
  canLog: boolean;
  canSession: boolean;
  inboundPayload: Record<string, unknown>;
}

async function createAndReply(
  ctx: IngestContext,
  args: CreateArgs
): Promise<IngestResult> {
  const { supabase } = ctx;
  const { draft, farmer } = args;

  const reportPayload: Record<string, unknown> = {
    reporter_id: farmer.id,
    animal_id: null,
    species: draft.species,
    symptoms: draft.symptoms,
    free_text: draft.freeText,
    sick_count: draft.sickCount,
    dead_count: draft.deadCount,
    geo: draft.geoEwkt,
    village: draft.village,
    taluka: draft.taluka,
    district: draft.district,
    status: "pending",
    offline_ts: new Date().toISOString(),
  };
  if (args.canWriteSource) reportPayload.source = args.channel;

  const { data: inserted, error } = await supabase
    .from("reports")
    .insert(reportPayload)
    .select("id, status, district")
    .single();

  let reportId: string | null = null;
  let parseNote: string | undefined;
  if (error) {
    parseNote = `report insert failed: ${error.message}`;
  } else if (inserted) {
    reportId = inserted.id as string;
  }

  // Wait for the on_report_created trigger → triage edge function to write a result.
  let candidates: Candidate[] | null = null;
  let urgency: Urgency | null = null;
  let notifiable = false;
  if (reportId) {
    const triaged = await waitForTriage(supabase, reportId);
    if (triaged) {
      candidates = triaged.candidates;
      urgency = triaged.urgency;
      notifiable = triaged.notifiable;
    }
  }

  const reply =
    candidates && candidates.length
      ? buildReportReply(args.locale, {
          species: draft.species,
          symptoms: draft.symptoms,
          sickCount: draft.sickCount,
          deadCount: draft.deadCount,
          candidates,
          urgency,
          notifiable,
        })
      : `${CONFIRMED[args.locale]}\n${officerFallback(args.locale)}`;

  await logMessage(supabase, args.canLog, {
    channel: args.channel,
    direction: "inbound",
    phone: args.phone,
    message_type: String(args.inboundPayload.message_type ?? "text"),
    text: args.rawText,
    payload: args.inboundPayload,
    report_id: reportId,
    district: draft.district,
  });
  await logMessage(supabase, args.canLog, {
    channel: args.channel,
    direction: "outbound",
    phone: args.phone,
    message_type: "text",
    text: reply,
    payload: {},
    report_id: reportId,
    district: draft.district,
  });

  return {
    ok: !error,
    reportId,
    nextStep: null,
    reply,
    draft,
    note: parseNote,
    completed: Boolean(reportId),
    topDiseaseCode: candidates?.[0]?.code ?? null,
  };
}

/** Poll the triage trigger writer for a result (edge fn runs async). */
async function waitForTriage(
  supabase: SupabaseClient,
  reportId: string,
  timeoutMs = 6000
): Promise<{ candidates: Candidate[] | null; urgency: Urgency | null; notifiable: boolean } | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await supabase
      .from("triage_results")
      .select("disease_candidates, confidence, urgency, notifiable_flag, source")
      .eq("report_id", reportId)
      .single();
    if (data) {
      return {
        candidates: (data.disease_candidates as Candidate[]) ?? null,
        urgency: (data.urgency as Urgency) ?? null,
        notifiable: Boolean(data.notifiable_flag),
      };
    }
    await new Promise((r) => setTimeout(r, 450));
  }
  return null;
}

// ---- session persistence (degrades to stateless before the migration) ------

interface SessionRow {
  phone: string;
  channel: Channel;
  locale: ChannelLocale;
  step: SessionStep | null;
  draft: SessionDraft;
  report_id?: string | null;
}

async function loadSession(
  supabase: SupabaseClient,
  enabled: boolean,
  phone: string
): Promise<SessionRow | null> {
  if (!enabled) return null;
  const { data } = await supabase
    .from("channel_sessions")
    .select("phone, channel, locale, step, draft")
    .eq("phone", phone)
    .maybeSingle();
  return (data as SessionRow) ?? null;
}

async function saveSession(
  supabase: SupabaseClient,
  enabled: boolean,
  phone: string,
  channel: Channel,
  locale: ChannelLocale,
  step: SessionStep | null,
  draft: SessionDraft
): Promise<void> {
  if (!enabled) return;
  const record = { phone, channel, locale, step, draft, updated_at: new Date().toISOString() };
  await supabase.from("channel_sessions").upsert(record, { onConflict: "phone" });
}

// ---- channel_messages logging (degrades to no-op before the migration) -------

async function logMessage(
  supabase: SupabaseClient,
  enabled: boolean,
  row: {
    channel: Channel;
    direction: "inbound" | "outbound";
    phone: string;
    message_type: string;
    text: string | null;
    payload: Record<string, unknown>;
    report_id: string | null;
    district: string | null;
  }
): Promise<void> {
  if (!enabled) return;
  await supabase.from("channel_messages").insert(row);
}

function officerFallback(locale: ChannelLocale): string {
  const map: Record<ChannelLocale, string> = {
    en: "The district veterinary officer has been alerted and will follow up.",
    hi: "जिला पशु चिकित्सा अधिकारी को सूचित किया गया है और वे अनुसरण करेंगे।",
    mr: "जिल्हा पशुवैद्यकीय अधिकाऱ्याला कळवले आहे आणि ते पाठपुरावा करतील.",
  };
  return map[locale];
}

export { buildHelp };
