import { getTranslations } from "next-intl/server";
import { TriageIcon } from "@/components/icons";

export default async function TriagePage() {
  const t = await getTranslations("triage");
  return (
    <section className="page-in">
      <div className="eyebrow">{t("eyebrow")}</div>
      <div className="h1">{t("heading")}</div>
      <p className="lede">{t("lede")}</p>
      <div className="empty">
        <span className="e-ico">
          <TriageIcon />
        </span>
        <div className="e-t">{t("emptyTitle")}</div>
        <div className="e-s">{t("emptyBody")}</div>
      </div>
      <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.1em] text-mut">
        {t("disclaimer")}
      </p>
    </section>
  );
}
