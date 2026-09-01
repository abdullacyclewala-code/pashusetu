"use client";

import { useEffect } from "react";

/** Registers the PWA service worker (offline cache stub — Part 1 adds sync). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
