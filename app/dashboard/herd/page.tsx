import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { HerdClient, type Animal, type Vaccination, type CoverageRow } from "./HerdClient";

export default async function HerdPage() {
  const t = await getTranslations("herd");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login");

  const { data: animals } = await supabase
    .from("animals")
    .select("id, species, tag_id, breed, dob, created_at")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false })
    .returns<Animal[]>();

  const ids = (animals ?? []).map((a) => a.id);
  const { data: vaccinations } =
    ids.length > 0
      ? await supabase
          .from("vaccinations")
          .select(
            "id, animal_id, vaccine, dose_no, date, administered_by, campaign"
          )
          .in("animal_id", ids)
          .order("date", { ascending: false })
          .returns<Vaccination[]>()
      : { data: [] as Vaccination[] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("district")
    .eq("id", uid)
    .single<{ district: string | null }>();
  const district = profile?.district ?? null;

  const coverage: CoverageRow[] = district
    ? (
        await supabase.rpc("vaccination_coverage", { p_district: district })
      ).data ?? []
    : [];

  return (
    <section className="page-in">
      <div className="eyebrow">{t("eyebrow")}</div>
      <div className="h1">{t("heading")}</div>
      <p className="lede">{t("lede")}</p>
      <HerdClient
        initialAnimals={animals ?? []}
        ownerId={uid}
        initialVaccinations={vaccinations ?? []}
        coverage={coverage}
        district={district}
      />
    </section>
  );
}
