import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/bhashini";

/**
 * POST /api/bhashini/tts  body: { text, language }
 * Returns synthesized audio (audio/mpeg) via Bhashini when configured.
 * Returns 501 when Bhashini isn't configured — the client falls back to
 * browser SpeechSynthesis so voice still works offline/without a key.
 */
export async function POST(req: Request) {
  let payload: { text?: unknown; language?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const language = typeof payload.language === "string" ? payload.language.trim() : "";

  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
  if (!language) return NextResponse.json({ error: "language is required" }, { status: 400 });

  const result = await synthesizeSpeech(text, language);

  if (!result.ok) {
    if (result.reason === "not_configured") {
      return NextResponse.json(
        { error: "Bhashini is not configured", reason: "not_configured" },
        { status: 501 }
      );
    }
    return NextResponse.json(
      { error: "speech synthesis failed", reason: result.reason, detail: result.detail ?? null },
      { status: 502 }
    );
  }

  return new NextResponse(result.data.audio, {
    status: 200,
    headers: {
      "Content-Type": result.data.contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
