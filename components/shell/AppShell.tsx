"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import {
  CowIcon,
  GridIcon,
  PlusIcon,
  RowsIcon,
  HerdIcon,
  TriageIcon,
  LogoutIcon,
  BellIcon,
  PinIcon,
  WhatsAppIcon,
} from "@/components/icons";

/**
 * Responsive app shell:
 *  laptop → sidebar + topbar + content
 *  mobile → top bar + fixed bottom tab bar
 * Navigation is role-gated. The active tab updates OPTIMISTICALLY on
 * click (before the server round-trip) so switching feels instant;
 * route-level loading.tsx paints the skeleton while data loads.
 */

type NavKey = "dash" | "report" | "cases" | "herd" | "alerts" | "whatsapp" | "iot" | "triage";

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
  { key: "iot", href: "/dashboard/iot", roles: ["vet", "officer", "admin"], icon: TriageIcon },
  { key: "alerts", href: "/dashboard/alerts", roles: ALL, icon: BellIcon },
  {
    key: "whatsapp",
    href: "/dashboard/whatsapp",
    roles: ALL,
    icon: WhatsAppIcon,
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

function keyFromPath(pathname: string): NavKey {
  const seg = pathname.split("/")[2];
  if (
    seg === "report" ||
    seg === "cases" ||
    seg === "herd" ||
    seg === "alerts" ||
    seg === "triage" ||
    seg === "whatsapp" ||
    seg === "iot"
  )
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

  // optimistic active tab — set on click, reconciled when the URL changes
  const [target, setTarget] = useState<NavKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setTarget(null);
    setMenuOpen(false);
  }, [pathname]);
  const active = target ?? keyFromPath(pathname);

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
      <aside className="sticky top-0 z-50 hidden h-screen w-[240px] shrink-0 flex-col border-r border-line bg-card px-4 pt-6 pb-4 min-[881px]:flex">
        <Link
          href="/dashboard"
          onClick={() => setTarget("dash")}
          className="flex items-center gap-3 px-2 pb-7"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-sage-on">
            <CowIcon className="h-[19px] w-[19px]" />
          </span>
          <span>
            <span className="font-serif text-lg font-semibold leading-none tracking-tight">
              Pashu<b className="text-accent">Setu</b>
            </span>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-mut">
              पशुसेतु
            </div>
          </span>
        </Link>

        <div className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
          {t("nav.workspace")}
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((n) => (
            <SideLink
              key={n.key}
              item={n}
              active={active}
              label={t(`nav.${n.key}`)}
              onGo={setTarget}
            />
          ))}
        </nav>

        {screening.length > 0 && (
          <>
            <div className="mt-5 px-3 pb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-mut2">
              {t("nav.screening")}
            </div>
            <nav className="flex flex-col gap-0.5">
              {screening.map((n) => (
                <SideLink
                  key={n.key}
                  item={n}
                  active={active}
                  label={t(`nav.${n.key}`)}
                  onGo={setTarget}
                />
              ))}
            </nav>
          </>
        )}

        <div className="mt-auto border-t border-line-2 pt-3">
          <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">
              {initial}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-semibold leading-tight">
                {profile.name}
              </span>
              <span className="block truncate text-[11.5px] text-mut">
                {t(`roles.${profile.role}`)}
              </span>
            </span>
            <button
              type="button"
              onClick={logout}
              aria-label={t("nav.logout")}
              title={t("nav.logout")}
              className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-mut transition hover:bg-accent-soft hover:text-accent"
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ---- main column ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* mobile top bar */}
        <div className="sticky top-0 z-50 flex h-14 items-center gap-2.5 border-b border-line bg-paper/90 px-4 backdrop-blur min-[881px]:hidden">
          <Link href="/dashboard" onClick={() => setTarget("dash")} className="flex items-center gap-2.5">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-[10px] bg-ink text-sage-on">
              <CowIcon className="h-4 w-4" />
            </span>
            <span className="font-serif text-base font-semibold tracking-tight">
              Pashu<b className="text-accent">Setu</b>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2.5">
            <LanguageSwitcher />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label={profile.name}
                aria-expanded={menuOpen}
                className="grid h-[30px] w-[30px] place-items-center rounded-full bg-accent-soft text-[11px] font-bold text-accent"
              >
                {initial}
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl border border-line bg-card p-2 shadow-[var(--shadow-card)]">
                    <div className="px-3 py-2">
                      <div className="truncate text-[14px] font-bold text-ink">
                        {profile.name}
                      </div>
                      <div className="truncate text-[12px] text-mut">
                        {t(`roles.${profile.role}`)}
                        {profile.district ? ` · ${profile.district}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-accent transition-colors hover:bg-accent-soft"
                    >
                      <LogoutIcon className="h-4 w-4" />
                      {t("nav.logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* desktop top bar */}
        <div className="sticky top-0 z-40 hidden h-[62px] items-center gap-3.5 border-b border-line bg-paper/85 px-[clamp(18px,3vw,40px)] backdrop-blur min-[881px]:flex">
          <div className="font-serif text-[19px] font-semibold tracking-tight">
            {t(`titles.${active}`)}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {profile.district && (
              <span className="chip max-[1023px]:hidden">
                <PinIcon className="h-3.5 w-3.5" />
                {profile.district}
              </span>
            )}
            <LanguageSwitcher />
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1080px] flex-1 px-[clamp(18px,3vw,40px)] pt-[clamp(22px,3vw,36px)] pb-[90px] max-[880px]:px-4 max-[880px]:pt-5 max-[880px]:pb-28">
          {children}
        </main>
        <OfflineSyncBadge />
      </div>

      {/* ---- bottom tabs (mobile) ---- */}
      <nav className="fixed inset-x-0 bottom-0 z-[60] hidden border-t border-line bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)] max-[880px]:block">
        {(() => {
          const items = tabs.filter((n) => n.key !== "report");
          const Tab = (n: NavItem) => {
            const is = active === n.key;
            return (
              <Link
                key={n.key}
                href={n.href}
                onClick={() => setTarget(n.key)}
                className={`flex h-full flex-col items-center justify-center gap-1 whitespace-nowrap text-[10px] font-semibold ${
                  is ? "text-accent" : "text-mut2"
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full transition ${
                    is ? "bg-accent-soft" : ""
                  }`}
                >
                  <n.icon className="h-[20px] w-[20px]" />
                </span>
                {t(n.key === "dash" ? "nav.home" : `nav.${n.key}`)}
              </Link>
            );
          };
          const mid = Math.ceil(items.length / 2);
          const cols = canReport ? items.length + 1 : items.length;
          return (
            <div
              className="mx-auto grid h-[64px] max-w-[480px]"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {items.slice(0, canReport ? mid : items.length).map(Tab)}
              {canReport && (
                <div className="flex items-center justify-center">
                  <Link
                    href="/dashboard/report"
                    onClick={() => setTarget("report")}
                    aria-label={t("nav.report")}
                    className="grid h-[52px] w-[52px] -translate-y-[14px] place-items-center rounded-full border-4 border-paper bg-accent text-white shadow-[0_4px_14px_rgba(168,67,31,0.35)] transition active:scale-95"
                  >
                    <PlusIcon className="h-[22px] w-[22px]" />
                  </Link>
                </div>
              )}
              {canReport && items.slice(mid).map(Tab)}
            </div>
          );
        })()}
      </nav>
    </div>
  );
}

function SideLink({
  item,
  active,
  label,
  onGo,
}: {
  item: NavItem;
  active: NavKey;
  label: string;
  onGo: (k: NavKey) => void;
}) {
  const is = active === item.key;
  return (
    <Link
      href={item.href}
      onClick={() => onGo(item.key)}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition ${
        is
          ? "bg-accent-soft font-bold text-accent"
          : "font-semibold text-mut hover:bg-line-2 hover:text-ink"
      }`}
    >
      <item.icon className="h-[17px] w-[17px] shrink-0" />
      {label}
    </Link>
  );
}
