"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  CowIcon,
  GridIcon,
  PlusIcon,
  RowsIcon,
  HerdIcon,
  TriageIcon,
  LogoutIcon,
} from "@/components/icons";

/**
 * Responsive app shell from the approved mock:
 *  laptop  → sidebar + topbar + content
 *  mobile  → top bar + fixed bottom tab bar
 * Navigation is role-gated: farmers see report/herd tools,
 * officers/vets/labs see the surveillance side.
 */

type NavKey = "dash" | "report" | "cases" | "herd" | "triage";

interface NavItem {
  key: NavKey;
  href: string;
  roles: Role[];
  icon: React.ComponentType<{ className?: string }>;
}

const ALL: Role[] = ["farmer", "pashu_mitra", "vet", "officer", "lab", "admin"];

const NAV: NavItem[] = [
  { key: "dash", href: "/dashboard", roles: ALL, icon: GridIcon },
  {
    key: "report",
    href: "/dashboard/report",
    roles: ["farmer", "pashu_mitra", "vet", "admin"],
    icon: PlusIcon,
  },
  {
    key: "cases",
    href: "/dashboard/cases",
    roles: ["vet", "officer", "lab", "admin"],
    icon: RowsIcon,
  },
  {
    key: "herd",
    href: "/dashboard/herd",
    roles: ["farmer", "pashu_mitra", "admin"],
    icon: HerdIcon,
  },
];

const SCREENING: NavItem[] = [
  {
    key: "triage",
    href: "/dashboard/triage",
    roles: ["farmer", "pashu_mitra", "vet", "officer", "admin"],
    icon: TriageIcon,
  },
];

function activeKey(pathname: string): NavKey {
  const seg = pathname.split("/")[2];
  if (seg === "report" || seg === "cases" || seg === "herd" || seg === "triage")
    return seg;
  return "dash";
}

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const active = activeKey(pathname);

  const nav = NAV.filter((n) => n.roles.includes(profile.role));
  const screening = SCREENING.filter((n) => n.roles.includes(profile.role));
  const tabs = [...nav, ...screening];
  const canReport = nav.some((n) => n.key === "report");

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (profile.name || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* ---- sidebar (laptop) ---- */}
      <aside className="sticky top-0 z-50 hidden h-screen w-[220px] shrink-0 flex-col border-r border-line bg-card px-4 pt-6 pb-[18px] min-[881px]:flex">
        <Link href="/dashboard" className="flex items-center gap-[11px] px-2 pb-[26px]">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-ink text-sage-on">
            <CowIcon className="h-[19px] w-[19px]" />
          </span>
          <span>
            <span className="font-serif text-lg font-semibold leading-none tracking-tight">
              Pashu<b className="text-accent">Setu</b>
            </span>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-mut">
              पशुसेतु
            </div>
          </span>
        </Link>

        <div className="px-2 pb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-mut2">
          {t("nav.workspace")}
        </div>
        <nav className="flex flex-col gap-[2px]">
          {nav.map((n) => (
            <SideLink key={n.key} item={n} active={active} label={t(`nav.${n.key}`)} />
          ))}
        </nav>

        {screening.length > 0 && (
          <>
            <div className="mt-[18px] px-2 pb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-mut2">
              {t("nav.screening")}
            </div>
            <nav className="flex flex-col gap-[2px]">
              {screening.map((n) => (
                <SideLink key={n.key} item={n} active={active} label={t(`nav.${n.key}`)} />
              ))}
            </nav>
          </>
        )}

        <div className="mt-auto flex flex-col gap-2 border-t border-line-2 pt-[14px]">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-[11px] rounded-[9px] px-3 py-[10px] text-left text-[13.5px] font-semibold text-mut transition hover:bg-[#F5F0E4] hover:text-ink"
          >
            <LogoutIcon className="h-[17px] w-[17px] shrink-0" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* ---- main column ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <div className="sticky top-0 z-50 flex h-14 items-center gap-2.5 border-b border-line bg-card px-4 min-[881px]:hidden">
          <Link href="/dashboard" className="flex items-center gap-[11px]">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-ink text-sage-on">
              <CowIcon className="h-4 w-4" />
            </span>
            <span className="font-serif text-base font-semibold tracking-tight">
              Pashu<b className="text-accent">Setu</b>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <LanguageSwitcher />
            <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-accent text-[11px] font-bold text-white">
              {initial}
            </span>
          </div>
        </div>

        {/* desktop top bar */}
        <div className="sticky top-0 z-40 hidden h-[60px] items-center gap-3.5 border-b border-line bg-card px-[clamp(18px,3vw,40px)] min-[881px]:flex">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-mut">
              {t(`crumbs.${active}`)}
            </div>
            <div className="mt-px font-serif text-lg font-semibold tracking-tight">
              {t(`titles.${active}`)}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mut">
              {t(`roles.${profile.role}`)}
              {profile.district ? ` · ${profile.district}` : ""}
            </span>
            <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-accent text-xs font-bold text-white">
              {initial}
            </span>
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1140px] flex-1 px-[clamp(18px,3vw,40px)] pt-[clamp(22px,3.4vw,44px)] pb-[90px] max-[880px]:px-4 max-[880px]:pt-5 max-[880px]:pb-24">
          {children}
        </main>
      </div>

      {/* ---- bottom tabs (mobile) ---- */}
      <nav className="fixed inset-x-0 bottom-0 z-[60] hidden border-t border-line bg-card pb-[env(safe-area-inset-bottom)] max-[880px]:block">
        <div className="mx-auto flex h-[62px] max-w-[480px] items-center px-1">
          {(() => {
            const items = tabs.filter((n) => n.key !== "report");
            const mid = Math.ceil(items.length / 2);
            const Tab = (n: NavItem) => (
              <Link
                key={n.key}
                href={n.href}
                className={`relative flex flex-col items-center gap-[3px] px-2 py-[5px] font-mono text-[9.5px] font-semibold uppercase tracking-[0.04em] ${
                  active === n.key ? "text-accent" : "text-mut2"
                }`}
              >
                {active === n.key && (
                  <span className="absolute -top-[9px] left-1/2 h-[2px] w-7 -translate-x-1/2 bg-accent" />
                )}
                <n.icon className="h-[21px] w-[21px]" />
                {t(n.key === "dash" ? "nav.home" : `nav.${n.key}`)}
              </Link>
            );
            if (!canReport)
              return (
                <div className="flex flex-1 items-center justify-around">
                  {items.map(Tab)}
                </div>
              );
            return (
              <>
                <div className="flex flex-1 items-center justify-evenly">
                  {items.slice(0, mid).map(Tab)}
                </div>
                <Link
                  href="/dashboard/report"
                  aria-label={t("nav.report")}
                  className="-mt-6 grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full border-4 border-card bg-accent text-white shadow-[0_4px_12px_rgba(168,67,31,0.35)]"
                >
                  <PlusIcon className="h-[22px] w-[22px]" />
                </Link>
                <div className="flex flex-1 items-center justify-evenly">
                  {items.slice(mid).map(Tab)}
                </div>
              </>
            );
          })()}
        </div>
      </nav>
    </div>
  );
}

function SideLink({
  item,
  active,
  label,
}: {
  item: NavItem;
  active: NavKey;
  label: string;
}) {
  const is = active === item.key;
  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-[11px] rounded-[9px] px-3 py-[10px] text-[13.5px] transition ${
        is
          ? "bg-[#F3E7DA] font-bold text-accent"
          : "font-semibold text-mut hover:bg-[#F5F0E4] hover:text-ink"
      }`}
    >
      {is && (
        <span className="absolute -left-4 top-2 bottom-2 w-[3px] rounded-sm bg-accent" />
      )}
      <item.icon className={`h-[17px] w-[17px] shrink-0 ${is ? "text-accent" : ""}`} />
      {label}
    </Link>
  );
}
