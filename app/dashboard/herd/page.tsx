import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { HerdClient, type Animal } from "./HerdClient";

export default async function HerdPage() {
  const t = await getTranslations("herd");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: animals } = await supabase
    .from("animals")
    .select("id, species, tag_id, breed, dob, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .returns<Animal[]>();

  return (
    <section className="page-in">
      <div className="eyebrow">{t("eyebrow")}</div>
      <div className="h1">{t("heading")}</div>
      <p className="lede">{t("lede")}</p>
      <HerdClient initialAnimals={animals ?? []} ownerId={user.id} />
    </section>
  );
}
