"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { clusterColor } from "@/lib/clusters";

export interface ClusterMapPoint {
  id: string;
  lat: number;
  lng: number;
  severity: string;
  radiusKm: number | null;
  caseCount: number;
  title: string;
  sub: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Cluster overlay: one ring per outbreak, sized by case count, coloured by
 * severity, with a slim radius indicator. Reused the warm OSM base + the
 * same pinned-radius rendering as CaseMap so the officer UI stays consistent.
 */
export function ClusterMap({ points }: { points: ClusterMapPoint[] }) {
  const holder = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
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
      for (const p of initial) {
        const color = clusterColor(p.severity);
        const radius = Math.max(14, Math.min(34, 10 + p.caseCount * 4));
        // severity ring (case-count sized)
        L.circleMarker([p.lat, p.lng], {
          radius,
          color: "#fffdf7",
          weight: 2.5,
          fillColor: color,
          fillOpacity: 0.35,
        }).addTo(map);
        // centre dot
        L.circleMarker([p.lat, p.lng], {
          radius: 5,
          color: "#fffdf7",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(map);
        // outer indicator, scaled to the radius in km
        if (p.radiusKm && p.radiusKm > 0) {
          const meters = p.radiusKm * 1000;
          L.circle([p.lat, p.lng], {
            radius: meters,
            color,
            weight: 1.2,
            dashArray: "4 5",
            fillColor: color,
            fillOpacity: 0.06,
            interactive: false,
          }).addTo(map);
        }
      }
      map.fitBounds(
        L.latLngBounds(initial.map((p) => [p.lat, p.lng])),
        { padding: [40, 40], maxZoom: 10 }
      );

      // popups attached last so they sit above the ring markers
      for (const p of initial) {
        const color = clusterColor(p.severity);
        L.circleMarker([p.lat, p.lng], {
          radius: 5,
          color,
          opacity: 1,
          weight: 1,
          fillColor: color,
          fillOpacity: 1,
        })
          .bindPopup(`<b>${esc(p.title)}</b><br>${esc(p.sub)}`)
          .addTo(map);
      }
    } else {
      map.setView([18.75, 74.2], 8);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initial]);

  return (
    <div
      ref={holder}
      className="case-map h-[300px] w-full md:h-[380px]"
      aria-label="cluster map"
    />
  );
}
