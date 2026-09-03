"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { BellIcon, CheckIcon, PinIcon } from "@/components/icons";
import { AlertTriangleIcon } from "@/components/icons";
import type { AlertRow, ClusterRow } from "@/lib/alerts/types";
import { clusterColor, clusterDiseaseName, isNewCluster } from "@/lib/clusters";
import type { ClusterMapPoint } from "./ClusterMap";

const ClusterMap = dynamic(() => import("./ClusterMap").then((m) => m.ClusterMap), {
  ssr: false,
  loading: () => <div className="skel h-[300px] w-full rounded-[18px] md:h-[380px]" />,
});

const SEVERITY_CHIP: Record<string, { bg: string; fg: string }> = {
  info: { bg: "#EDF0DE", fg: "#5E6E3E" },
  warning: { bg: "#FBF3DC", fg: "#8A6D1F" },
  critical: { bg: "#F9E3DB", fg: "#A8431F" },
};

function relative(createdAt: string, now: number, formatter: Intl.RelativeTimeFormat) {
  const diffSec = Math.round((now - new Date(createdAt).getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return formatter.format(diffSec, "second");
  if (abs < 3600) return formatter.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(diffSec / 3600), "hour");
  return formatter.format(Math.round(diffSec / 86400), "day");
}

export function AlertsClient({
  initialAlerts,
  initialClusters,
  district,
}: {
  initialAlerts: AlertRow[];
  initialClusters: ClusterRow[];
  district: string | null;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const now = Date.now();
  const [alerts, setAlerts] = useState<AlertRow[]>(initialAlerts);
  const [clusters, setClusters] = useState<ClusterRow[]>(initialClusters);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [busy, setBusy] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  /* ── realtime: clusters + alerts stream in live ── */
  useEffect(() => {
    const channel = supabase
      .channel("alerts-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clusters" },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          if (n.status !== "active") return;
          // computed lat/lng + the disease embed aren't in the realtime payload,
          // so fetch the full row to render the map overlay correctly.
          supabase
            .from("clusters")
            .select(
              "id, disease_guess, case_count, radius_km, district, village, severity, status, first_seen, last_seen, created_at, lat, lng, diseases:clusters_disease_guess_fkey(code, name_en, name_hi, name_mr)"
            )
            .eq("id", n.id as string)
            .maybeSingle<ClusterRow>()
            .then(({ data }) => {
              if (!data) return;
              setClusters((prev) =>
                prev.some((c) => c.id === data.id)
                  ? prev
                  : [data, ...prev]
              );
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          setAlerts((prev) => {
            if (prev.some((a) => a.id === n.id)) return prev;
            return [n as unknown as AlertRow, ...prev];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  /*** Mark an alert read (optimistic) ***/
  async function markRead(id: string) {
    setBusy(id);
    const prev = alerts;
    setAlerts((a) => a.map((x) => (x.id === id ? { ...x, read: true } : x)));
    const { error } = await supabase
      .from("alerts")
      .update({ read: true })
      .eq("id", id);
    if (error) setAlerts(prev);
    setBusy(null);
  }

  async function markAllRead() {
    const unreadIds = alerts.filter((a) => !a.read).map((a) => a.id);
    if (unreadIds.length === 0) return;
    const prev = alerts;
    setAlerts((a) => a.map((x) => ({ ...x, read: true })));
    const { error } = await supabase
      .from("alerts")
      .update({ read: true })
      .in("id", unreadIds);
    if (error) setAlerts(prev);
  }

  const visible =
    filter === "unread" ? alerts.filter((a) => !a.read) : alerts;

  const unreadCount = alerts.filter((a) => !a.read).length;
  const localizedMessage = (a: AlertRow) =>
    a.message_json?.[locale as keyof typeof a.message_json] ??
    a.message_json?.en ??
    "";

  const hasClusters = clusters.length > 0;
  const mapPoints = useMemo<ClusterMapPoint[]>(
    () =>
      clusters
        .filter((c) => c.lat != null && c.lng != null)
        .map((c) => ({
          id: c.id,
          lat: c.lat as number,
          lng: c.lng as number,
          severity: c.severity,
          radiusKm: c.radius_km,
          caseCount: c.case_count,
          title: clusterDiseaseName(c, locale),
          sub: `${t("clusters.cases", { count: c.case_count })} · ${t("clusters.radius", {
            km: (c.radius_km ?? 0).toFixed(1),
          })}`,
        })),
    [clusters, locale, t]
  );

  return (
    <div className="mt-6 flex flex-col gap-5">
      {/* ---- outbreak cluster banner + map ---- */}
      {hasClusters && (
        <div className="card overflow-hidden">
          <div
            className="flex items-center gap-3 border-b border-line-2 px-5 py-3.5"
            style={{ background: "#F9E3DB" }}
          >
            <AlertTriangleIcon className="h-5 w-5 shrink-0 text-[#A8431F]" />
            <div className="min-w-0">
              <div className="text-[14.5px] font-bold leading-tight text-[#A8431F]">
                {t("clusters.banner")}
              </div>
              <div className="text-[12.5px] text-[#A8431F]/80">
                {t("clusters.bannerBody", {
                  count: clusters.length,
                  district: district ?? "—",
                })}
              </div>
            </div>
          </div>

          {/* cluster cards */}
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
            {clusters.map((c) => {
              const color = clusterColor(c.severity);
              const sev = c.severity === "critical" ? "critical" : "warning";
              const chip = SEVERITY_CHIP[sev] ?? SEVERITY_CHIP.warning;
              const isNew = isNewCluster(c, now);
              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-3 rounded-2xl border border-line bg-paper/50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 grid h-3 w-3 shrink-0 place-items-center rounded-full"
                      style={{ background: color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-[17px] font-semibold leading-tight">
                          {clusterDiseaseName(c, locale)}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                          style={{ background: chip.bg, color: chip.fg }}
                        >
                          {t(`clusters.severity.${sev}`)}
                        </span>
                        {isNew && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                            {t("clusters.newBadge")}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-mut">
                        <span>
                          {t("clusters.cases", { count: c.case_count })}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-line" />
                        <span className="flex items-center gap-1">
                          <PinIcon className="h-3 w-3" />
                          {c.village ?? c.district ?? "—"}
                        </span>
                        {c.radius_km != null && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-line" />
                            <span>
                              {t("clusters.radius", { km: (c.radius_km).toFixed(1) })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* cluster map */}
          <div className="border-t border-line-2 p-2">
            {mapPoints.length === 0 ? (
              <div className="grid h-[220px] place-items-center px-6 text-center text-[13px] text-mut">
                {t("clusters.emptyMap")}
              </div>
            ) : (
              <ClusterMap points={mapPoints} />
            )}
          </div>
        </div>
      )}

      {/* ---- alert inbox ---- */}
      <div className="overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
              <BellIcon className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2 text-[14px] font-bold text-ink">
                {t("alerts.heading")}
                {unreadCount > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="text-[11.5px] text-mut">{t("alerts.lede")}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  filter === f
                    ? "bg-ink text-paper"
                    : "border border-line bg-card text-mut hover:text-ink"
                }`}
              >
                {t(`alerts.filter${f === "all" ? "All" : "Unread"}`)}
              </button>
            ))}
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="rounded-full border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:border-ink disabled:opacity-40"
            >
              {t("alerts.markAllRead")}
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="border-t border-line-2 px-6 py-12 text-center text-[13.5px] text-mut">
            {filter === "unread" ? t("alerts.emptyFilter") : t("alerts.emptyBody")}
          </div>
        ) : (
          <ul className="border-t border-line-2">
            {visible.map((a) => {
              const chip = SEVERITY_CHIP[a.severity] ?? SEVERITY_CHIP.info;
              return (
                <li
                  key={a.id}
                  className={`flex items-start gap-3.5 border-b border-line-2 px-5 py-4 last:border-b-0 ${
                    a.read ? "" : "bg-gold-soft/30"
                  }`}
                >
                  <span
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    style={{ background: chip.bg, color: chip.fg }}
                  >
                    <BellIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]"
                        style={{ background: chip.bg, color: chip.fg }}
                      >
                        {t(`alerts.severity.${a.severity}`)}
                      </span>
                      {!a.read && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                          {t("alerts.newBadge")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
                      {localizedMessage(a)}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-mut">
                      <span suppressHydrationWarning>
                        {relative(a.created_at, now, new Intl.RelativeTimeFormat(locale))}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-line" />
                      <span>{a.district ?? ""}</span>
                    </div>
                  </div>
                  {!a.read && (
                    <button
                      disabled={busy === a.id}
                      onClick={() => markRead(a.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-card text-mut transition hover:border-ink hover:text-ink disabled:opacity-40"
                      aria-label={t("alerts.markRead")}
                      title={t("alerts.markRead")}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
