"use client";

import { useEffect, useRef } from "react";

/**
 * 3D breathing regional terrain — pure canvas, zero data.
 * Ported as-is from the approved frontend mock; this is the hero "wow" visual.
 * Crest points pulse like sensors ("every farmer is a sensor").
 */
export function HeroTerrain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const GRID = 26;
    const grid: { u: number; v: number; seed: number }[] = [];
    for (let iy = 0; iy <= GRID; iy++)
      for (let ix = 0; ix <= GRID; ix++)
        grid.push({
          u: (ix / GRID) * 2 - 1,
          v: (iy / GRID) * 2 - 1,
          seed: Math.random() * 6.28,
        });

    function size() {
      if (!canvas || !ctx) return;
      const r = canvas.parentElement!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const height = (u: number, v: number, t: number) =>
      0.28 * Math.sin(u * 3.2 + t * 0.35) +
      0.2 * Math.sin(v * 3.6 + t * 0.28) +
      0.12 * Math.sin((u + v) * 2.4 + t * 0.2) +
      0.07 * Math.sin(u * 7.0 - t * 0.15) * Math.cos(v * 7.0 - t * 0.1);

    const proj = (
      p: { x: number; y: number; z: number },
      ry: number,
      rx: number
    ) => {
      const x1 = p.x * Math.cos(ry) + p.z * Math.sin(ry);
      const z1 = -p.x * Math.sin(ry) + p.z * Math.cos(ry);
      const y2 = p.y * Math.cos(rx) - z1 * Math.sin(rx);
      const z2 = p.y * Math.sin(rx) + z1 * Math.cos(rx);
      return { x: x1, y: y2, z: z2 };
    };

    let t = 0;
    let raf = 0;

    function draw() {
      if (!canvas || !ctx) return;
      t += 0.011;
      const r = canvas.parentElement!.getBoundingClientRect();
      const W = r.width;
      const H = r.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = W * 0.64;
      const cy = H * 0.54;
      const R = Math.min(W, H) * 0.42;
      const ry = t * 0.22;
      const rx = 0.62 + Math.sin(t * 0.18) * 0.1;

      // ambient glow
      const gl = ctx.createRadialGradient(cx, cy - 30, 0, cx, cy - 30, R * 2.2);
      gl.addColorStop(0, "rgba(179,198,138,0.07)");
      gl.addColorStop(1, "rgba(179,198,138,0)");
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W, H);

      // base floor
      ctx.beginPath();
      ctx.ellipse(cx, cy + R * 0.34, R * 1.15, R * 0.34, 0, 0, 7);
      ctx.fillStyle = "rgba(237,230,214,0.025)";
      ctx.fill();

      // project every grid point
      const pts = grid.map((g) => {
        const p = proj({ x: g.u, y: height(g.u, g.v, t), z: g.v }, ry, rx);
        const s = 1 / (2.0 - p.z * 0.55);
        return {
          x: cx + p.x * R * 1.25 * s,
          y: cy - p.y * R * 1.25 * s,
          z: p.z,
          seed: g.seed,
        };
      });

      // wireframe back-to-front
      const depth: { z: number; e: [number, number][] }[] = [];
      for (let iy = 0; iy < GRID; iy++)
        for (let ix = 0; ix < GRID; ix++) {
          const i0 = iy * (GRID + 1) + ix;
          const i1 = i0 + 1;
          const i2 = i0 + (GRID + 1);
          const i3 = i2 + 1;
          depth.push({
            z: (pts[i0].z + pts[i2].z) / 2,
            e: [
              [i0, i2],
              [i1, i3],
            ],
          });
          depth.push({
            z: (pts[i0].z + pts[i1].z) / 2,
            e: [
              [i0, i1],
              [i2, i3],
            ],
          });
        }
      depth.sort((a, b) => b.z - a.z);
      ctx.lineWidth = 1;
      for (const d of depth)
        for (const [a, b] of d.e) {
          ctx.strokeStyle = "rgba(179,198,138," + (0.035 + d.z * 0.05) + ")";
          ctx.beginPath();
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(pts[b].x, pts[b].y);
          ctx.stroke();
        }

      // sensor nodes on crests pulse
      const order = [...pts].sort((a, b) => a.z - b.z);
      for (const p of order) {
        const crest = p.seed > 5.6;
        if (crest) {
          const pu = 0.5 + 0.5 * Math.sin(t * 2.6 + p.seed);
          ctx.strokeStyle = "rgba(183,205,142," + (0.16 + p.z * 0.25) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 8 + 6 * pu, 0, 7);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 + 4 * pu, 0, 7);
          ctx.strokeStyle = "rgba(183,205,142,0.3)";
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, crest ? 2.6 : 1.4, 0, 7);
        ctx.fillStyle = crest
          ? "rgba(183,205,142,0.95)"
          : "rgba(217,211,196," + (0.18 + p.z * 0.4) + ")";
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    size();
    draw();
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" />;
}
