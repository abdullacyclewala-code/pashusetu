/**
 * PashuSetu · P7 — farmer-channel (WhatsApp/IVR) shared types.
 *
 * These types describe a *normalised* inbound message and the *parsed* report
 * draft it becomes. The parser is the single source of truth for turning raw
 * farmer text / button taps into the canonical report fields; the ingest
 * module (`lib/channel/ingest.ts`) then writes an ordinary `reports` row so it
 * flows through the existing triage → cluster → case pipeline unchanged.
 */

export type Channel = "whatsapp" | "ivr";
export type ChannelLocale = "en" | "hi" | "mr";

export type InboundType =
  | "text"
  | "voice"
  | "interactive"
  | "location"
  | "image"
  | "unknown";

/** A WhatsApp interactive reply (button tap / list selection). */
export interface InboundInteractive {
  type: "button" | "list" | "quick_reply";
  /** The human-readable label the farmer tapped (e.g. "Cattle", "Fever"). */
  title: string;
  /** Optional machine payload (e.g. "species:cattle" or "symptom:fever"). */
  payload?: string;
}

/** A normalised inbound message, independent of transport. */
export interface InboundMessage {
  channel: Channel;
  /** Normalised E.164 with leading + and full country code (e.g. +919004553021). */
  phone: string;
  messageType: InboundType;
  /** Text body — a typed message, a button title, or a transcribed voice note. */
  text?: string;
  /** For `voice` messages: the media URL to transcribe (Bhashini ASR). */
  audioUrl?: string;
  /** For `location` (shared) messages. */
  location?: { lat: number; lng: number } | null;
  /** For `interactive` replies. */
  interactive?: InboundInteractive | null;
}

/** Fields the parser is able to recover from a message. */
export interface ReportDraft {
  species: string | null;
  symptoms: string[];
  sickCount: number;
  deadCount: number;
  village: string | null;
  taluka: string | null;
  district: string | null;
  /** EWKT "SRID=4326;POINT(lng lat)" for the reports.geo column. */
  geoEwkt: string | null;
  /** Raw message text stored as free_text for the officer to read. */
  freeText: string | null;
  /** The village row we resolved (name/taluka/district) if any. */
  matchedVillage: { name: string; taluka: string; district: string } | null;
  /** Tokens we could not classify — surfaced back so the farmer can clarify. */
  unclear: string[];
}

/** The "next question" we ask a farmer during an interactive conversation. */
export type SessionStep =
  | "idle"
  | "species"
  | "symptoms"
  | "counts"
  | "location";

/** Serialisable conversation state stored in channel_sessions.draft. */
export interface SessionDraft {
  species?: string | null;
  symptoms?: string[];
  sickCount?: number;
  deadCount?: number;
  village?: string | null;
  taluka?: string | null;
  district?: string | null;
  /** EWKT "SRID=4326;POINT(lng lat)" if the farmer shared a location. */
  geo?: string | null;
}

/** A channel_message row (inbound/outbound log). */
export interface ChannelMessageRow {
  id: string;
  channel: Channel;
  direction: "inbound" | "outbound";
  phone: string;
  message_type: string;
  text: string | null;
  payload: Record<string, unknown>;
  report_id: string | null;
  reply_text: string | null;
  district: string | null;
  created_at: string;
}

/** The result of ingesting a message (webhook + simulator share this). */
export interface IngestResult {
  ok: boolean;
  /** The report id that was created (null when we only advanced a conversation). */
  reportId: string | null;
  /** Which step the conversation is at now (null once a report is created). */
  nextStep: SessionStep | null;
  /** The reply to send back to the farmer. */
  reply: string;
  /** Parsed draft (for the simulator to show what we understood). */
  draft: ReportDraft | null;
  /** Message for the operator when something went wrong / needs attention. */
  note?: string;
  /** Whether this batch completed a report (farmers may need a clarifying tap). */
  completed: boolean;
  /** The triage top disease code, if triage completed (for the simulator). */
  topDiseaseCode?: string | null;
}
