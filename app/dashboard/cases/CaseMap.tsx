"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

export interface MapPoint { id:string; lat:number; lng:number; urgency:string; title:string; sub:string; weight:number; }
const PIN:Record<string,string>={low:"#7A8C51",medium:"#B98523",high:"#C06A2A",critical:"#A8431F"};
const HEAT_GRADIENT={0.2:"#f2e2b8",0.5:"#e0a95e",0.8:"#c06a2a",1.0:"#a8431f"};
const esc=(s:string)=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/**
 * Village-centroid fallback reports can share the exact same coordinate. Spread
 * only their display markers in a small ring (~90 m) so every report remains
 * clickable; heat and stored coordinates remain geographically truthful.
 */
function spread(points:MapPoint[]) {
  const groups=new Map<string,MapPoint[]>();
  for(const p of points){const key=`${p.lat.toFixed(5)}:${p.lng.toFixed(5)}`;groups.set(key,[...(groups.get(key)??[]),p]);}
  return points.map(p=>{const group=groups.get(`${p.lat.toFixed(5)}:${p.lng.toFixed(5)}`)!;if(group.length===1)return {...p,displayLat:p.lat,displayLng:p.lng};const index=group.findIndex(x=>x.id===p.id);const angle=2*Math.PI*index/group.length;const radius=.0008+Math.floor(index/8)*.00035;return {...p,displayLat:p.lat+Math.sin(angle)*radius,displayLng:p.lng+Math.cos(angle)*radius};});
}

/** Live district map. It redraws when Realtime adds a report, rather than
 * freezing the server snapshot, so a farmer's new report appears immediately. */
export function CaseMap({points}:{points:MapPoint[]}) {
  const holder=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!holder.current)return;
    const map=L.map(holder.current,{scrollWheelZoom:false});
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
    const visible=spread(points);
    if(visible.length){
      L.heatLayer(points.map(p=>[p.lat,p.lng,Math.min(1,p.weight/10)] as [number,number,number]),{radius:30,blur:22,maxZoom:11,minOpacity:.3,gradient:HEAT_GRADIENT}).addTo(map);
      for(const p of visible){
        // Add the optional leader first, then the marker. Layer insertion order
        // already keeps the marker above it; calling bringToFront here races
        // Leaflet's SVG renderer attachment and can dereference parentNode.
        if(p.displayLat!==p.lat)L.polyline([[p.lat,p.lng],[p.displayLat,p.displayLng]],{color:PIN[p.urgency]??PIN.medium,weight:1,opacity:.45,dashArray:"2 4",interactive:false}).addTo(map);
        L.circleMarker([p.displayLat,p.displayLng],{radius:7,color:"#fffdf7",weight:2,fillColor:PIN[p.urgency]??PIN.medium,fillOpacity:.96})
          .bindPopup(`<b>${esc(p.title)}</b><br>${esc(p.sub)}`).addTo(map);
      }
      map.fitBounds(L.latLngBounds(visible.map(p=>[p.displayLat,p.displayLng])),{padding:[36,36],maxZoom:12});
    }else map.setView([19.0000386,73.1045685],10);
    return()=>{map.remove();};
  },[points]);
  return <div ref={holder} className="case-map h-[320px] w-full md:h-[420px]" aria-label="case map"/>;
}
