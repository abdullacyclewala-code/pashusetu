import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppClient, type FarmerReport, type LiveReport } from "./WhatsAppClient";
import type { ChannelMessageRow } from "@/lib/channel/types";
import type { VillageRow } from "@/lib/channel/parser";

export default async function WhatsAppPage() {
  const t = await getTranslations("whatsapp");
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, district, phone")
    .eq("id", uid)
    .single<{ role: string | null; district: string | null; phone: string | null }>();
  if (!profile) redirect("/login");

  const role = profile.role ?? "farmer";
  const isFarmer = ["farmer", "pashu_mitra"].includes(role);
  const isOfficial = ["vet", "officer", "lab", "admin"].includes(role);
  if (!isFarmer && !isOfficial) redirect("/dashboard");

  // The PashuSetu WhatsApp number a farmer messages. Defaults to the live
  // PashuSetu number; override with WHATSAPP_FROM_NUMBER when a Business API
  // number is provisioned. A normal registered WhatsApp number works for the
  // "Open WhatsApp" deep link (wa.me) — farmers message it to report.
  const whatsappNumber = process.env.WHATSAPP_FROM_NUMBER || "+919004553021";

  // Villages for the simulator's location picker (signed-in readable).
  const { data: villages } = await supabase
    .from("villages")
    .select("name, taluka, district")
    .order("name")
    .returns<VillageRow[]>();

  // Farmers: their own reports (any source) so they can see their history +
  // the source (app vs WhatsApp). Officials: the channel inbox + live reports.
  let farmerReports: FarmerReport[] = [];
  let messages: ChannelMessageRow[] = [];
  let liveReports: LiveReport[] = [];
  let schemaReady = false;

  if (isFarmer) {
    const mine = await supabase
      .from("reports")
      .select(
        "id, species, symptoms, sick_count, dead_count, village, district, source, status, created_at, triage_results(disease_candidates, urgency)"
      )
      .eq("reporter_id", uid)
      .order("created_at", { ascending: false })
      .limit(8);
    farmerReports = mine.error ? [] : (mine.data ?? [] as unknown as FarmerReport[]);
  } else {
    const inbox = await supabase
      .from("channel_messages")
      .select(
        "id, channel, direction, phone, message_type, text, reply_text, report_id, district, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(40);
    if (!inbox.error) {
      messages = (inbox.data ?? []) as unknown as ChannelMessageRow[];
      schemaReady = true;
    }

    const reports = await supabase
      .from("reports")
      .select(
        "id, species, sick_count, dead_count, district, status, created_at, triage_results(disease_candidates, urgency)"
      )
      .order("created_at", { ascending: false })
      .limit(6);
    liveReports = reports.error ? [] : (reports.data ?? []);
  }

  const eyebrow = isFarmer ? t("eyebrow") : t("eyebrow");
  const heading = isFarmer ? t("farmerHeading") : t("heading");
  const lede = isFarmer ? t("farmerLede") : t("lede");

  return (
    <section className="page-in">
      <div className="eyebrow">{eyebrow}</div>
      <div className="h1">{heading}</div>
      <p className="lede">{lede}</p>

      <WhatsAppClient
        view={isFarmer ? "farmer" : "official"}
        villages={villages ?? []}
        initialMessages={messages}
        schemaReady={schemaReady}
        initialReports={liveReports}
        farmerReports={farmerReports}
        whatsappNumber={whatsappNumber}
        farmerPhone={profile.phone ?? null}
      />
    </section>
  );
}
