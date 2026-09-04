/**
 * PashuSetu · P7 — simulator endpoint.
 *
 * Drives the SAME `ingestMessage` pipeline as the real WhatsApp webhook, but
 * from the officer dashboard instead of the Meta Graph API. This lets a judge
 * demo the entire report → triage → localised advisory reply flow live with a
 * single typed message, without a real Meta Business number/token.
 *
 * Authenticated: must be an officer/lab/vet/admin (RLS-session checked).
 */

import { NextResponse } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ingestMessage } from "@/lib/channel/ingest";
import type { InboundMessage } from "@/lib/channel/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, district")
    .eq("id", user.id)
    .single<{ role: string; district: string | null }>();
  if (!profile || !["officer", "lab", "vet", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: {
    phone?: string;
    messageType?: string;
    text?: string;
    interactive?: InboundMessage["interactive"];
    location?: { lat: number; lng: number } | null;
    channel?: "whatsapp" | "ivr";
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const msg: InboundMessage = {
    channel: body.channel ?? "whatsapp",
    phone: String(body.phone ?? "+919900000000"),
    messageType: (body.messageType as InboundMessage["messageType"]) ?? "text",
    text: body.text,
    audioUrl: undefined,
    location: body.location ?? null,
    interactive: body.interactive ?? null,
  };

  const result = await ingestMessage(
    {
      supabase: createSupabase(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      ),
      channel: msg.channel,
    },
    msg
  ).catch((e) => ({
    ok: false,
    note: e instanceof Error ? e.message : String(e),
    reply: "",
    completed: false,
  }));

  return NextResponse.json(result);
}
