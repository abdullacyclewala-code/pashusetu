"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslations } from "next-intl";
import { localDb } from "@/lib/offline/db";
import { syncPendingReports } from "@/lib/offline/sync";

/**
 * Floating sync-status pill (Anchor B: visible sync status).
 * Shows how many reports are queued locally; kicks off a sync on mount,
 * whenever the browser comes back online, and on tap.
 */
export function OfflineSyncBadge() {
  const t = useTranslations("sync");
  const [syncing, setSyncing] = useState(false);
  const count = useLiveQuery(() => localDb.pendingReports.count(), [], 0);

  useEffect(() => {
    const kick = async () => {
      setSyncing(true);
      try {
        await syncPendingReports();
      } finally {
        setSyncing(false);
      }
    };
    kick();
    window.addEventListener("online", kick);
    const interval = setInterval(kick, 60_000);
    return () => {
      window.removeEventListener("online", kick);
      clearInterval(interval);
    };
  }, []);

  if (!count) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        setSyncing(true);
        try {
          await syncPendingReports();
        } finally {
          setSyncing(false);
        }
      }}
      className="fixed bottom-[86px] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-ink px-4 py-2 text-[12px] font-semibold text-sage-on shadow-lg min-[881px]:bottom-6"
    >
      <span
        className={`h-2 w-2 rounded-full ${
          syncing ? "animate-pulse bg-sage-on" : "bg-[#E8B44F]"
        }`}
      />
      {syncing ? t("syncing") : t("pending", { count })}
    </button>
  );
}
