import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/data/session";
import { HeroMap } from "@/components/HeroMap";
import {
  PlusIcon,
  HerdIcon,
  TriageIcon,
  RowsIcon,
  PinIcon,
} from "@/components/icons";

const DAY = 86_400_000;

function greetingKey() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(new Date())
  );
  if (hour < 12) return "greetingMorning" as const;
  if (hour < 17) return "greetingAfternoon" as const;
  return "greetingEvening" as const;
}

export default async function DashboardPage() {
  const [t, tr, format, profile, supabase] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations(), // root — for triage.urgency.* and roles.*
    getFormatter(),
    getSessionProfile(),
    createClient(),
  ]);

  const role = profile?.role ?? "farmer";
  const farmerSide = role === "farmer" || role === "pashu_mitra";
  const canReport = ["farmer", "pashu_mitra", "vet", "admin"].includes(role);
  const canHerd = ["farmer", "pashu_mitra", "admin"].includes(role);
  const canCases = ["vet", "officer", "lab", "admin"].includes(role);
  const canTriage = role !== "lab";

  // ---- live counts (RLS scopes these to the signed-in user / district) ----
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const since14 = new Date(Date.now() - 14 * DAY).toISOString();

  const stats: { label: string; value: string; accent?: boolean }[] = [];

  if (farmerSide) {
    const [herd, reports, latest] = await Promise.all([
      supabase.from("animals").select("id", { count: "exact", head: true }),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since30),
      supabase
        .from("triage_results")
        .select("urgency")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    const urgency = latest.data?.[0]?.urgency as string | undefined;
    stats.push(
      { label: t("statHerd"), value: String(herd.count ?? 0) },
      { label: t("statReports"), value: String(reports.count ?? 0) },
      {
        label: t("statTriage"),
        value: urgency ? tr(`triage.urgency.${urgency}`) : t("statNone"),
        accent: urgency === "critical" || urgency === "high",
      }
    );
  } else {
    const [recent, urgent, total] = await Promise.all([
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since14),
      supabase
        .from("triage_results")
        .select("id", { count: "exact", head: true })
        .in("urgency", ["critical", "high"])
        .gte("created_at", since14),
      supabase.from("reports").select("id", { count: "exact", head: true }),
    ]);
    stats.push(
      { label: t("statDistrictReports"), value: String(recent.count ?? 0) },
      {
        label: t("statUrgent"),
        value: String(urgent.count ?? 0),
        accent: (urgent.count ?? 0) > 0,
      },
      { label: t("statAllReports"), value: String(total.count ?? 0) }
    );
  }

  const place = [profile?.village, profile?.district]
    .filter(Boolean)
    .join(", ");

  const actions = [
    canReport && {
      href: "/dashboard/report",
      icon: PlusIcon,
      title: t("quickReportT"),
      body: t("quickReportB"),
      primary: true,
    },
    canHerd && {
      href: "/dashboard/herd",
      icon: HerdIcon,
      title: t("quickHerdT"),
      body: t("quickHerdB"),
    },
    canTriage && {
      href: "/dashboard/triage",
      icon: TriageIcon,
      title: t("quickTriageT"),
      body: t("quickTriageB"),
    },
    canCases && {
      href: "/dashboard/cases",
      icon: RowsIcon,
      title: t("quickCasesT"),
      body: t("quickCasesB"),
    },
  ].filter(Boolean) as {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
    primary?: boolean;
  }[];

  return (
    <section className="page-in flex flex-col gap-6">
      {/* ---- hero: greeting + live 3D network map ---- */}
      <div className="hero hero-dash">
        <div className="h-in">
          <div className="h-kicker">
            {format.dateTime(new Date(), { dateStyle: "full" })}
          </div>
          <h1>{t(greetingKey(), { name: profile?.name ?? "" })}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="chip">{tr(`roles.${role}`)}</span>
            {place && (
              <span className="chip">
                <PinIcon className="h-3.5 w-3.5" />
                {place}
              </span>
            )}
          </div>
          <p>{t("heroLine")}</p>
          {canReport && (
            <div className="h-cta">
              <Link href="/dashboard/report" className="btn btn-solid">
                {t("quickReportT")}
              </Link>
            </div>
          )}
        </div>
        <HeroMap caption={t("mapCaption")} />
      </div>

      {/* ---- live stats ---- */}
      <div className="grid grid-cols-3 gap-3 max-[740px]:grid-cols-1">
        {stats.map((s) => (
          <div key={s.label} className="card px-5 py-4">
            <div
              className={`font-serif text-[26px] font-semibold leading-tight ${
                s.accent ? "text-accent" : ""
              }`}
            >
              {s.value}
            </div>
            <div className="mt-0.5 text-[12.5px] font-medium text-mut">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ---- quick actions ---- */}
      <div>
        <h2 className="mb-3 font-serif text-[17px] font-semibold">
          {t("quickTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`card group flex items-center gap-4 px-5 py-4 transition hover:-translate-y-0.5 ${
                a.primary ? "!border-accent/25 !bg-accent-soft" : ""
              }`}
            >
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                  a.primary
                    ? "bg-accent text-white"
                    : "bg-sage-soft text-sage"
                }`}
              >
                <a.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold leading-snug">
                  {a.title}
                </span>
                <span className="block text-[12.5px] text-mut">{a.body}</span>
              </span>
              <span className="ml-auto text-mut2 transition group-hover:translate-x-0.5 group-hover:text-accent">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
