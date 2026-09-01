import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { HeroTerrain } from "@/components/HeroTerrain";
import { GridIcon } from "@/components/icons";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user!.id)
    .single();

  return (
    <section className="page-in">
      <div className="eyebrow">{t("eyebrow")}</div>
      <div className="h1">{t("heading")}</div>
      <p className="lede">{t("welcome", { name: profile?.name ?? "" })}</p>

      <div className="hero mt-[22px]">
        <HeroTerrain />
        <div className="h-in">
          <div className="h-kicker">{t("heroKicker")}</div>
          <h1 dangerouslySetInnerHTML={{ __html: t.raw("heroTitle") }} />
          <p>{t("heroSub")}</p>
          <div className="h-cta">
            {(profile?.role === "farmer" ||
              profile?.role === "pashu_mitra" ||
              profile?.role === "vet" ||
              profile?.role === "admin") && (
              <Link href="/dashboard/report" className="btn btn-solid">
                {t("heroCta")}
              </Link>
            )}
            {(profile?.role === "officer" ||
              profile?.role === "vet" ||
              profile?.role === "lab" ||
              profile?.role === "admin") && (
              <Link href="/dashboard/cases" className="btn btn-ghost">
                {t("heroCta2")}
              </Link>
            )}
          </div>
        </div>
        <div className="h-cap">{t("heroCap")}</div>
      </div>

      <div className="empty">
        <span className="e-ico">
          <GridIcon />
        </span>
        <div className="e-t">{t("emptyTitle")}</div>
        <div className="e-s">{t("emptyBody")}</div>
      </div>
    </section>
  );
}
