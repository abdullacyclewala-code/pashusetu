import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Farmer-owned deterministic demo. Database RPCs verify auth.uid() and device
 * ownership, so neither reset nor run relies on a privileged browser/server key. */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims?.sub)
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fn = body.action === "reset" ? "reset_my_iot_demo" : "run_my_iot_demo";
    const { data, error } = await supabase.rpc(fn);
    if (error) {
      console.error("sensor demo RPC failed", { fn, code: error.code, message: error.message });
      const message = error.message.includes("demo_sensors_not_linked")
        ? "Demo sensors are not linked to this farmer account"
        : error.message.includes("farmer_only")
          ? "This demo is available to farmers only"
          : "Could not update the sensor demo. Please try again.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(body.action === "reset" ? { ok: true } : data);
  } catch (error) {
    console.error("sensor demo route failed", error);
    return NextResponse.json({ error: "Could not update the sensor demo. Please try again." }, { status: 500 });
  }
}
