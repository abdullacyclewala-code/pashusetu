/**
 * PashuSetu · P7 — simulator endpoint.
 *
 * Drives the SAME `ingestMessage` pipeline as the real WhatsApp webhook, but
 * from the in-app dashboard instead of the Meta Graph API. This lets a judge
 * (or a farmer using the in-app demo) see the entire report → triage →
 * localised advisory reply flow live with a single typed message, without a
 * real Meta Business number/token.
 *
 * Authenticated: any signed-in user with a profile (officer/lab/vet/admin on
 * the receiving side; farmer/pashu_mitra on the farmer demo side).
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
  // Any signed-in user with a role may drive this in-app demo (officers
  // monitor the receiving end; farmers use the demo to see the reply).
  if (!profile || !["officer", "lab", "vet", "admin", "farmer", "pashu_mitra"].includes(profile.role)) {
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
