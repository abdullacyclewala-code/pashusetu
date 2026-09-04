/**
 * PashuSetu · P7 — WhatsApp Cloud API client (Meta).
 *
 * Two responsibilities:
 *   1. Normalise a Meta webhook payload into our transport-agnostic
 *      `InboundMessage[]` (text, button replies, interactive lists, shared
 *      location, and voice/audio notes).
 *   2. Send replies via the Messages endpoint (text / interactive / audio).
 *
 * Production-identical: when `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` are
 * configured the replies are POSTed to the Graph API. When they are NOT (e.g. a
 * hackathon sandbox, or before the Meta Business account is set up) the client
 * returns `mode: 'stored'` and the reply is persisted + shown by the in-app
 * simulator, so the whole report→triage→reply pipeline is demoable without a
 * Meta token.
 */

import type { Channel, InboundMessage, InboundInteractive } from "./channel/types";

export function isWhatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Verify the Meta webhook GET handshake. */
export function verifyWebhook(query: URLSearchParams, verifyToken: string): boolean {
  const mode = query.get("hub.mode");
  const token = query.get("hub.verify_token");
  const challenge = query.get("hub.challenge");
  if (mode === "subscribe" && token === verifyToken) return challenge !== null;
  return false;
}

/** Convert a Meta `messages` object into our InboundMessage. */
function normalizeMetaMessage(raw: Record<string, unknown>): InboundMessage {
  const from = String(raw.from ?? "");
  const type = String(raw.type ?? "unknown");

  let text: string | undefined;
  let interactive: InboundInteractive | null = null;
  let location: { lat: number; lng: number } | null = null;
  let audioUrl: string | undefined;
  let messageType: InboundMessage["messageType"] = "unknown";

  if (type === "text") {
    text = (raw.text as { body?: string })?.body;
    messageType = "text";
  } else if (type === "button") {
    const btn = raw.button as { text?: string } | undefined;
    text = btn?.text;
    messageType = "interactive";
    interactive = { type: "button", title: text ?? "" };
  } else if (type === "interactive") {
    const it = raw.interactive as { button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
    const reply = it?.button_reply ?? it?.list_reply;
    text = reply?.title;
    messageType = "interactive";
    interactive = {
      type: it?.list_reply ? "list" : "button",
      title: reply?.title ?? "",
      payload: reply?.id,
    };
  } else if (type === "location") {
    const loc = raw.location as { latitude?: number; longitude?: number };
    location = { lat: Number(loc?.latitude ?? 0), lng: Number(loc?.longitude ?? 0) };
    messageType = "location";
  } else if (type === "audio" || type === "voice") {
    audioUrl = (raw.audio as { id?: string })?.id;
    messageType = "voice";
  } else if (type === "image") {
    messageType = "image";
  }

  return {
    channel: "whatsapp",
    phone: from,
    messageType,
    text,
    audioUrl,
    location,
    interactive,
  };
}

/** Parse a Meta webhook request body into inbound messages. */
export function parseWebhook(body: unknown): InboundMessage[] {
  const b = body as {
    entry?: Array<{
      changes?: Array<{ value?: { messages?: Array<Record<string, unknown>> } }>;
    }>;
  };
  const messages: InboundMessage[] = [];
  for (const entry of b?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const m of change?.value?.messages ?? []) {
        messages.push(normalizeMetaMessage(m));
      }
    }
  }
  return messages;
}

/** A message we can send back (text, voice, or interactive buttons). */
export interface OutboundSms {
  to: string;
  text?: string;
  audioContentType?: string;
  audio?: ArrayBuffer;
  buttons?: Array<{ id: string; title: string }>;
}

/** Where/how the send landed. */
export type SendResult =
  | { mode: "sent"; messageId?: string }
  | { mode: "stored"; reason: "not_configured" | "no_content" };

const GRAPH = "https://graph.facebook.com/v19.0";

async function graph(url: string, token: string, body: unknown): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: [{ id: string }]; error?: { message?: string } };
  if (!res.ok) return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
  return { ok: true, messageId: json.messages?.[0]?.id };
}

/** Upload audio bytes as a persistent media id (for voice-note replies). */
async function uploadMedia(token: string, phoneNumberId: string, audio: ArrayBuffer, contentType: string): Promise<string | null> {
  const form = new FormData();
  form.append("type", "audio");
  form.append("messaging_product", "whatsapp");
  form.append("file", new Blob([audio], { type: contentType }), "advisory.mp3");
  const res = await fetch(`${GRAPH}/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return json.id ?? null;
}

/**
 * Send a reply. With no configured token/sender this returns `stored` (zero
 * network) — the simulator/inbox still has the reply text to display.
 */
export async function sendMessage(from: OutboundSms): Promise<SendResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    if (!from.text && !from.audio) return { mode: "stored", reason: "no_content" };
    return { mode: "stored", reason: "not_configured" };
  }

  // Voice note? Upload then send audio.
  if (from.audio) {
    const mediaId = await uploadMedia(token, phoneNumberId, from.audio, from.audioContentType ?? "audio/mpeg");
    if (mediaId) {
      const r = await graph(`${GRAPH}/${phoneNumberId}/messages`, token, {
        messaging_product: "whatsapp",
        to: from.to,
        type: "audio",
        audio: { id: mediaId },
      });
      return r.ok ? { mode: "sent", messageId: r.messageId } : { mode: "stored", reason: "not_configured" };
    }
  }

  // Interactive buttons?
  if (from.buttons && from.buttons.length) {
    const r = await graph(`${GRAPH}/${phoneNumberId}/messages`, token, {
      messaging_product: "whatsapp",
      to: from.to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: from.text ?? "" },
        action: {
          buttons: from.buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })),
        },
      },
    });
    return r.ok ? { mode: "sent", messageId: r.messageId } : { mode: "stored", reason: "not_configured" };
  }

  // Plain text.
  const r = await graph(`${GRAPH}/${phoneNumberId}/messages`, token, {
    messaging_product: "whatsapp",
    to: from.to,
    type: "text",
    text: { body: from.text ?? "" },
  });
  return r.ok ? { mode: "sent", messageId: r.messageId } : { mode: "stored", reason: "not_configured" };
}

export type { Channel };
