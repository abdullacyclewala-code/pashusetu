/**
 * PashuSetu · P7 — WhatsApp Cloud API webhook (Vercel serverless route).
 *
 * GET   → Meta verification handshake (echo hub.challenge).
 * POST  → receive messages → parse → create a report via the shared channel
 *          pipeline → send the localised advisory reply (text + optional voice).
 *
 * This is the production ingress for WhatsApp. It is transport-identical to the
 * simulator: both call `ingestMessage` in lib/channel/ingest.ts, so a report
 * created here appears on the officer dashboard exactly like an in-app report.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ingestMessage } from "@/lib/channel/ingest";
import {
  parseWebhook,
  sendMessage,
  verifyWebhook,
} from "@/lib/whatsapp";
import { synthesizeSpeech } from "@/lib/bhashini";
import { detectLanguage } from "@/lib/channel/parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? "pashusetu-wh-verify-v1";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (verifyWebhook(url.searchParams, VERIFY_TOKEN)) {
    return new NextResponse(url.searchParams.get("hub.challenge") ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("verify token mismatch", { status: 403 });
}

export async function POST(req: Request) {
  // We answer 200 fast even if downstream ingestion is slow, so Meta doesn't
  // retry the delivery. Replies are still sent (best-effort) below.
  const supabase = admin();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const messages = parseWebhook(body || {});
  if (messages.length === 0) {
    return NextResponse.json({ ok: true, received: 0 });
  }

  const outcomes: unknown[] = [];
  for (const msg of messages) {
    outcomes.push(
      await ingestMessage({ supabase, channel: "whatsapp" }, msg).catch((e) => ({
        ok: false,
        note: e instanceof Error ? e.message : String(e),
      }))
    );
    const last = outcomes[outcomes.length - 1] as { reply?: string; completed?: boolean };
    if (last?.reply) {
      try {
        // optional voice-note reply (Bhashini TTS) — falls back to text.
        // Speak in the language the farmer used in their message.
        const lang = detectLanguage(msg.text ?? "", "en");
        const speechTag: Record<string, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
        const voice = await synthesizeSpeech(last.reply, speechTag[lang] ?? "en-IN");
        if (voice.ok && voice.data.audio.byteLength > 0) {
          await sendMessage({
            to: msg.phone,
            audio: voice.data.audio,
            audioContentType: voice.data.contentType,
          });
        } else {
          await sendMessage({ to: msg.phone, text: last.reply });
        }
      } catch {
        await sendMessage({ to: msg.phone, text: last.reply }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ ok: true, received: messages.length, outcomes });
}
