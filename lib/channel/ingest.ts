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
  detectCounts,
  detectVillage,
  ewkbPointToLngLat,
  parseFreeText,
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

/** Forward-geocode a matched village row to an EWKT string (or null). */
function villageGeoEwkt(v: VillageRow | null | undefined): string | null {
  if (!v) return null;
  const pt = ewkbPointToLngLat(v.geo);
  return pt ? ewkt(pt.lng, pt.lat) : null;
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
    .select("name, taluka, district, geo")
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

  // 5) Extract signals from the current message (button title or free text).
  const interactive = msg.interactive ?? null;
  const label = interactive ? interactiveValue(interactive) : (msg.text ?? "");
  const msgSpecies = detectSpecies(label);
  const msgSymptoms = detectSymptoms(label);
  const hasCountWords = /sick|dead|died|बीमार|आजारी|मेले|मरे|मरा|मृत्यू/i.test(label);
  const msgCounts = detectCounts(label);
  const msgVillage = detectVillage(label, villages ?? []);

  // Fold the current message into the session draft.
  if (msgSpecies) draft.species = msgSpecies;
  if (msgSymptoms.length) {
    draft.symptoms = Array.from(new Set([...(draft.symptoms ?? []), ...msgSymptoms]));
  }
  if (msgVillage) {
    draft.village = msgVillage.name;
    draft.taluka = msgVillage.taluka;
    draft.district = msgVillage.district;
  }
  if (hasCountWords) {
    draft.sickCount = msgCounts.sickCount;
    draft.deadCount = msgCounts.deadCount;
  }

  // Free-text fast path may also supply species/symptoms/counts/location.
  const freeSpecies = parsed.species;
  const freeSymptoms = parsed.symptoms ?? [];
  const species = draft.species ?? freeSpecies;
  const symptoms = Array.from(new Set([...(draft.symptoms ?? []), ...freeSymptoms]));
  const sickCount =
    draft.sickCount ??
    (parsedHasCount(msg.text ?? "") ? parsed.sickCount : null);
  const deadCount =
    draft.deadCount ??
    (parsedHasCount(msg.text ?? "") ? parsed.deadCount : null);

  // Resolve a map point for the report. A shared-location pin always wins;
  // otherwise, if a *typed* village name was matched (e.g. "Shirur"), geocode
  // it from the villages table so the report gets a dot on the officer map.
  const resolvedVillageName = draft.village ?? parsed.village ?? farmer.village;
  const resolvedVillageRow =
    (villages ?? []).find((v) => v.name === resolvedVillageName) ?? null;
  const resolvedGeoEwkt =
    (draft.geo as string | null) ??
    (recv ? ewkt(recv.lng, recv.lat) : villageGeoEwkt(resolvedVillageRow)) ??
    null;

  const isGuided = interactive !== null || step !== "idle";

  // 6) Guided (multi-turn, button-driven) state machine.
  if (isGuided) {
    const next = nextMissing({
      species,
      symptoms,
      sickCount,
      deadCount,
      village: draft.village ?? parsed.village ?? farmer.village,
      geo: draft.geo ?? null,
    });

    // Nothing missing → build the report now.
    if (!next) {
      return await finishAndReply(ctx, {
        phone,
        locale: resolvedLocale,
        species,
        symptoms,
        sickCount: sickCount ?? 1,
        deadCount: deadCount ?? 0,
        village: draft.village ?? parsed.village ?? farmer.village,
        taluka: draft.taluka ?? parsed.taluka ?? farmer.taluka,
        district: draft.district ?? parsed.district ?? farmer.district,
        geoEwkt: resolvedGeoEwkt,
        matchedVillageName: draft.village ?? parsed.matchedVillage?.name ?? null,
        farmer,
        vill,
        freeText: msg.text ?? null,
        rawText: msg.text ?? null,
        channel,
        c,
        inboundPayload: {
          message_type: msg.messageType,
          text: msg.text ?? null,
          interactive: msg.interactive ?? null,
          location: msg.location ?? null,
        },
        unclear: parsed.unclear,
      });
    }

    const current = step === "idle" ? null : step;
    if (current === null) {
      await saveSession(supabase, c.sessions, phone, channel, resolvedLocale, next, draft);
      return { ok: true, reportId: null, nextStep: next, reply: buildClarify(resolvedLocale, next), draft: null, completed: false };
    }

    const answered = fieldAnswered(current, { species, symptoms, sickCount, deadCount, village: draft.village ?? parsed.village, geo: (draft.geo as string | null) ?? null });
    if (answered) {
      if (next !== current) {
        await saveSession(supabase, c.sessions, phone, channel, resolvedLocale, next, draft);
        return { ok: true, reportId: null, nextStep: next, reply: buildClarify(resolvedLocale, next), draft: null, completed: false };
      }
      // Same field still missing — ask again with any unclear tokens.
      await saveSession(supabase, c.sessions, phone, channel, resolvedLocale, current, draft);
      return { ok: true, reportId: null, nextStep: current, reply: buildClarify(resolvedLocale, current, parsed.unclear), draft: null, completed: false };
    }

    await saveSession(supabase, c.sessions, phone, channel, resolvedLocale, current, draft);
    return { ok: true, reportId: null, nextStep: current, reply: buildClarify(resolvedLocale, current, parsed.unclear), draft: null, completed: false };
  }

  // 7) Fast path — a plain text message that already carries species + symptoms.
  if (species && symptoms.length) {
    return await finishAndReply(ctx, {
      phone,
      locale: resolvedLocale,
      species,
      symptoms,
      sickCount: sickCount ?? 1,
      deadCount: deadCount ?? 0,
      village: draft.village ?? parsed.village ?? farmer.village,
      taluka: draft.taluka ?? parsed.taluka ?? farmer.taluka,
      district: draft.district ?? parsed.district ?? farmer.district,
      geoEwkt: resolvedGeoEwkt,
      matchedVillageName: draft.village ?? parsed.matchedVillage?.name ?? null,
      farmer,
      vill,
      freeText: msg.text ?? null,
      rawText: msg.text ?? null,
      channel,
      c,
      inboundPayload: {
        message_type: msg.messageType,
        text: msg.text ?? null,
        interactive: msg.interactive ?? null,
        location: msg.location ?? null,
      },
      unclear: parsed.unclear,
    });
  }

  // 8) Not enough for a report — start guiding (works for plain text too).
  const next: SessionStep = !species ? "species" : symptoms.length ? "counts" : "symptoms";
  await saveSession(supabase, c.sessions, phone, channel, resolvedLocale, next, draft);
  return { ok: true, reportId: null, nextStep: next, reply: buildClarify(resolvedLocale, next, parsed.unclear), draft: null, completed: false };
}

/** Did the supplied message mention sick/dead counts (so we trust the parse)? */
function parsedHasCount(text: string): boolean {
  return /sick|dead|died|बीमार|आजारी|मेले|मरे|मरा|मृत्यू/i.test(text);
}

/** The first field the farmer still needs to answer, in guided order. */
type MissingState = {
  species: string | null;
  symptoms: string[];
  sickCount: number | null;
  deadCount: number | null;
  village: string | null;
  geo: string | null;
};
function nextMissing(s: MissingState): SessionStep | null {
  if (!s.species) return "species";
  if (!s.symptoms.length) return "symptoms";
  if (typeof s.sickCount !== "number") return "counts";
  if (!s.village && !s.geo) return "location";
  return null;
}

/** Was the field for `step` answered by the accumulated draft? */
function fieldAnswered(step: SessionStep, s: MissingState): boolean {
  switch (step) {
    case "species": return !!s.species;
    case "symptoms": return s.symptoms.length > 0;
    case "counts": return typeof s.sickCount === "number";
    case "location": return !!s.village || !!s.geo;
    default: return true;
  }
}

interface FinishInput {
  phone: string;
  locale: ChannelLocale;
  species: string | null;
  symptoms: string[];
  sickCount: number;
  deadCount: number;
  village: string | null;
  taluka: string | null;
  district: string | null;
  geoEwkt: string | null;
  matchedVillageName: string | null;
  farmer: FarmerProfile;
  vill: { name: string; taluka: string; district: string } | null;
  freeText: string | null;
  rawText: string | null;
  channel: Channel;
  c: { reportsSource: boolean; channelLog: boolean; sessions: boolean };
  inboundPayload: Record<string, unknown>;
  unclear: string[];
}

/** Build the report row + send the localised reply (shared by guided + fast path). */
async function finishAndReply(
  ctx: IngestContext,
  input: FinishInput
): Promise<IngestResult> {
  const { supabase } = ctx;

  const draftForReport: ReportDraft = {
    species: input.species,
    symptoms: input.symptoms,
    sickCount: input.sickCount,
    deadCount: input.deadCount,
    village: input.village,
    taluka: input.taluka,
    district: input.district,
    geoEwkt: input.geoEwkt,
    freeText: input.freeText,
    matchedVillage: input.matchedVillageName
      ? { name: input.matchedVillageName, taluka: input.taluka ?? "", district: input.district ?? "" }
      : null,
    unclear: input.unclear,
  };

  const result = await createAndReply(ctx, {
    phone: input.phone,
    locale: input.locale,
    draft: draftForReport,
    farmer: input.farmer,
    rawText: input.rawText,
    channel: input.channel,
    canWriteSource: input.c.reportsSource,
    canLog: input.c.channelLog,
    canSession: input.c.sessions,
    inboundPayload: input.inboundPayload,
  });

  await saveSession(
    supabase,
    input.c.sessions,
    input.phone,
    input.channel,
    input.locale,
    null,
    {}
  );
  return result;
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
