import { getTranslations } from "next-intl/server";
import { RowsIcon } from "@/components/icons";

export default async function CasesPage() {
  const t = await getTranslations("cases");
  return (
    <section className="page-in">
      <div className="eyebrow">{t("eyebrow")}</div>
      <div className="h1">{t("heading")}</div>
      <p className="lede">{t("lede")}</p>
      <div className="empty">
        <span className="e-ico">
          <RowsIcon />
        </span>
        <div className="e-t">{t("emptyTitle")}</div>
        <div className="e-s">{t("emptyBody")}</div>
      </div>
    </section>
  );
}
