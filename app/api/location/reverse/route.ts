import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2"); url.searchParams.set("lat", String(lat)); url.searchParams.set("lon", String(lng)); url.searchParams.set("zoom", "16"); url.searchParams.set("addressdetails", "1");
    const response = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "PashuSetu/1.0 (livestock health reporting)", "Accept-Language": "en" }, next: { revalidate: 0 } });
    if (!response.ok) throw new Error(`geocoder ${response.status}`);
    const body = await response.json(); const a = body.address ?? {};
    const village = a.village ?? a.town ?? a.suburb ?? a.neighbourhood ?? a.city_district ?? a.city ?? null;
    const taluka = a.county ?? a.state_district ?? a.city_district ?? null;
    const district = a.state_district ?? a.city ?? a.county ?? null;
    if (!village || !district) throw new Error("Incomplete geocode");
    return NextResponse.json({ village, taluka, district, displayName: body.display_name ?? null, source: "openstreetmap" });
  } catch {
    return NextResponse.json({ error: "Reverse geocoding unavailable" }, { status: 503 });
  } finally { clearTimeout(timer); }
}
