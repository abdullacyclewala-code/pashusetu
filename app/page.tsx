import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HeroTerrain } from "@/components/HeroTerrain";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { CowIcon } from "@/components/icons";

export default async function LandingPage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1140px] flex-col px-[clamp(18px,3vw,40px)]">
      <header className="flex items-center gap-3 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-ink text-sage-on">
          <CowIcon className="h-[19px] w-[19px]" />
        </span>
        <span>
          <span className="font-serif text-lg font-semibold leading-none tracking-tight">
            Pashu<b className="text-accent">Setu</b>
          </span>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-mut">
            {t("app.script")}
          </div>
        </span>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="btn btn-line btn-sm">
            {t("landing.signIn")}
          </Link>
        </div>
      </header>

      <main className="page-in flex flex-1 flex-col justify-center pb-10">
        <div className="hero">
          <HeroTerrain />
          <div className="h-in">
            <div className="h-kicker">{t("landing.kicker")}</div>
            <h1
              dangerouslySetInnerHTML={{ __html: t.raw("landing.headline") }}
            />
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
          <div className="h-cap">{t("landing.cap")}</div>
        </div>

        <p className="mt-5 text-center font-mono text-[10.5px] uppercase tracking-[0.1em] text-mut">
          {t("landing.disclaimer")}
        </p>
      </main>
    </div>
  );
}
