import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HeroMap } from "@/components/HeroMap";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CowIcon, CloudOffIcon, LangIcon, TriageIcon } from "@/components/icons";

export default async function LandingPage() {
  const t = await getTranslations();

  const features = [
    { icon: CloudOffIcon, title: t("landing.feat1t"), body: t("landing.feat1b") },
    { icon: LangIcon, title: t("landing.feat2t"), body: t("landing.feat2b") },
    { icon: TriageIcon, title: t("landing.feat3t"), body: t("landing.feat3b") },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col px-[clamp(18px,3vw,40px)]">
      <header className="flex items-center gap-3 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sage-on">
          <CowIcon className="h-[19px] w-[19px]" />
        </span>
        <span>
          <span className="font-serif text-lg font-semibold leading-none tracking-tight">
            Pashu<b className="text-accent">Setu</b>
          </span>
          <div className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-mut">
            {t("app.script")}
          </div>
        </span>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="btn btn-line btn-sm whitespace-nowrap max-sm:hidden">
            {t("landing.signIn")}
          </Link>
        </div>
      </header>

      <main className="page-in flex flex-1 flex-col justify-center gap-5 pb-10 pt-2">
        <div className="hero">
          <div className="h-in">
            <div className="h-kicker">{t("landing.kicker")}</div>
            <h1 dangerouslySetInnerHTML={{ __html: t.raw("landing.headline") }} />
            <p>{t("landing.sub")}</p>
            <div className="h-cta">
              <Link href="/signup" className="btn btn-solid btn-lg">
                {t("landing.getStarted")}
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg">
                {t("landing.signIn")}
              </Link>
            </div>
          </div>
          <HeroMap caption={t("landing.cap")} />
        </div>

        <div className="grid grid-cols-3 gap-3 max-[740px]:grid-cols-1">
          {features.map((f) => (
            <div key={f.title} className="card flex items-start gap-3.5 px-5 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-soft text-sage">
                <f.icon className="h-[19px] w-[19px]" />
              </span>
              <span>
                <span className="block text-[14.5px] font-semibold leading-snug">
                  {f.title}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-mut">
                  {f.body}
                </span>
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-[12px] font-medium text-mut2">
          {t("landing.disclaimer")}
        </p>
      </main>
    </div>
  );
}
