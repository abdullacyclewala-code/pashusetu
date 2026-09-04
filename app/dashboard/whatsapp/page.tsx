import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppClient } from "./WhatsAppClient";
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
    .select("role, district")
    .eq("id", uid)
    .single<{ role: string | null; district: string | null }>();

  if (!profile || !["vet", "officer", "lab", "admin"].includes(profile.role ?? "")) {
    redirect("/dashboard");
  }

  // Villages for the simulator's location picker (public readable when signed in).
  const { data: villages } = await supabase
    .from("villages")
    .select("name, taluka, district")
    .order("name")
    .returns<VillageRow[]>();

  // Channel inbox — the channel_messages table only exists after migration 0007.
  let messages: ChannelMessageRow[] = [];
  let schemaReady = false;
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

  // Live reports in this officer's district (report ⇒ latest triage ⇒ disease).
  const reports = await supabase
    .from("reports")
    .select(
      "id, species, sick_count, dead_count, district, status, created_at, triage_results(disease_candidates, urgency)"
    )
    .order("created_at", { ascending: false })
    .limit(6);
  const liveReports = reports.error ? [] : (reports.data ?? []);

  return (
    <section className="page-in">
      <div className="eyebrow">{t("eyebrow")}</div>
      <div className="h1">{t("heading")}</div>
      <p className="lede">{t("lede")}</p>

      <WhatsAppClient
        villages={villages ?? []}
        initialMessages={messages}
        schemaReady={schemaReady}
        initialReports={liveReports}
      />
    </section>
  );
}
