"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  urgency: string;
  title: string;
  sub: string;
  /** animals affected — drives the heat layer weight */
  weight: number;
}

const PIN: Record<string, string> = {
  low: "#7A8C51",
  medium: "#B98523",
  high: "#C06A2A",
  critical: "#A8431F",
};

const HEAT_GRADIENT = {
  0.2: "#f2e2b8",
  0.5: "#e0a95e",
  0.8: "#c06a2a",
  1.0: "#a8431f",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * District case map: warm-toned tiles + heat glow (weighted by animals
 * affected) + one pin per geo-tagged report, coloured by triage urgency.
 * Initialized once from the SSR snapshot; live rows rarely carry GPS in
 * the same session, so the map refreshes on next visit rather than
 * re-mounting Leaflet on every realtime insert.
 */
export function CaseMap({ points }: { points: MapPoint[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  // freeze the initial snapshot (see docstring)
  const initial = useMemo(() => points, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!holder.current || mapRef.current) return;
    const map = L.map(holder.current, { scrollWheelZoom: false });
    mapRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (initial.length > 0) {
      L.heatLayer(
        initial.map(
          (p) => [p.lat, p.lng, Math.min(1, p.weight / 10)] as [number, number, number]
        ),
        { radius: 30, blur: 22, maxZoom: 11, minOpacity: 0.3, gradient: HEAT_GRADIENT }
      ).addTo(map);

      for (const p of initial) {
        L.circleMarker([p.lat, p.lng], {
          radius: 7,
          color: "#fffdf7",
          weight: 2,
          fillColor: PIN[p.urgency] ?? PIN.medium,
          fillOpacity: 0.95,
        })
          .bindPopup(`<b>${esc(p.title)}</b><br>${esc(p.sub)}`)
          .addTo(map);
      }

      map.fitBounds(
        L.latLngBounds(initial.map((p) => [p.lat, p.lng])),
        { padding: [36, 36], maxZoom: 10 }
      );
    } else {
      map.setView([18.75, 74.2], 8); // Pune region fallback
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initial]);

  return (
    <div
      ref={holder}
      className="case-map h-[320px] w-full md:h-[420px]"
      aria-label="case map"
    />
  );
}
