import { redirect } from "next/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { ReportWizard } from "./ReportWizard";
import { SPECIES } from "@/lib/report/constants";

export default async function ReportPage() {
  const t = await getTranslations();
  const format = await getFormatter();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: animals }, { data: recent }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
      supabase
        .from("animals")
        .select("id, species, tag_id, breed")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("reports")
        .select("id, species, sick_count, dead_count, village, created_at")
        .eq("reporter_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  if (!profile) redirect("/login");

  return (
    <section className="page-in">
      <div className="eyebrow">{t("report.eyebrow")}</div>
      <div className="h1">{t("report.heading")}</div>
      <p className="lede">{t("report.lede")}</p>

      <ReportWizard profile={profile} animals={animals ?? []} />

      {recent && recent.length > 0 && (
        <div className="card mt-6">
          <div className="card-head">
            <h3>{t("report.recent")}</h3>
          </div>
          <ul>
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 border-b border-line-2 px-5 py-3 text-[13.5px] last:border-b-0"
              >
                <span className="text-xl">
                  {SPECIES.find((s) => s.key === r.species)?.emoji ?? "🐾"}
                </span>
                <span className="font-semibold">
                  {t(`species.${r.species}`)}
                </span>
                <span className="text-mut">
                  {t("report.sick")} {r.sick_count} · {t("report.dead")}{" "}
                  {r.dead_count}
                </span>
                <span className="ml-auto text-right font-mono text-[10.5px] uppercase text-mut2">
                  {r.village ?? ""}
                  <br />
                  {format.dateTime(new Date(r.created_at), {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
