import map from "@/lib/map/maharashtra.json";

/**
 * Live surveillance map of Maharashtra as a floating 3D slab:
 * the real state outline extruded and tilted in CSS perspective,
 * with the 15 pilot villages as breathing sensor dots, data arcs
 * flowing to the hub (Mumbai) and a slow radar sweep.
 * Pure SVG + CSS animation — no canvas, no rAF, no client JS.
 */

const ALERT_INDEX = 2; // Baramati — the demo outbreak village

function arcPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const lift = Math.min(48, len * 0.22);
  const cx = mx - (dy / len) * lift;
  const cy = my + (dx / len) * lift;
  return `M${x1} ${y1}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`;
}

export function HeroMap({ caption }: { caption?: string }) {
  const { viewBox, path, villages, hub } = map;

  return (
    <div className="h-map" aria-hidden="true">
      <div className="ps-scene">
        <div className="ps-floor" />
        <div className="ps-plane">
          <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" fill="none">
            {/* extrusion — stacked dark copies give the slab depth */}
            <path d={path} transform="translate(7 22)" fill="#0e0903" opacity="0.85" />
            <path d={path} transform="translate(4.5 14)" fill="#161006" />
            <path d={path} transform="translate(2 7)" fill="#1f1709" />

            {/* top face */}
            <path
              d={path}
              fill="#2c2211"
              stroke="rgba(226, 206, 160, 0.55)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            {/* data arcs: village → hub */}
            {villages.map((v, i) => (
              <path
                key={`arc-${v.name}`}
                className="ps-arc"
                d={arcPath(v.x, v.y, hub.x, hub.y)}
                stroke={
                  i === ALERT_INDEX
                    ? "rgba(224, 122, 74, 0.5)"
                    : "rgba(200, 214, 156, 0.24)"
                }
                strokeWidth="1.1"
                style={{ animationDelay: `${(i % 5) * -0.9}s` }}
              />
            ))}

            {/* hub — department HQ */}
            <circle cx={hub.x} cy={hub.y} r="10" fill="rgba(243,201,107,0.14)" />
            <circle cx={hub.x} cy={hub.y} r="4.5" fill="#F3C96B" />
            <circle
              className="ps-ring"
              cx={hub.x}
              cy={hub.y}
              r="10"
              stroke="#F3C96B"
              strokeWidth="1.4"
            />

            {/* village sensor dots */}
            {villages.map((v, i) => {
              const alert = i === ALERT_INDEX;
              const c = alert ? "#E07A4A" : "#C8D69C";
              return (
                <g key={v.name}>
                  <circle
                    className="ps-ring"
                    cx={v.x}
                    cy={v.y}
                    r={alert ? 13 : 9}
                    stroke={c}
                    strokeWidth="1.3"
                    style={{ animationDelay: `${(i * 0.35) % 3.2}s` }}
                  />
                  <circle
                    className="ps-dot"
                    cx={v.x}
                    cy={v.y}
                    r={alert ? 4.4 : 3.2}
                    fill={c}
                    style={{ animationDelay: `${(i * 0.35) % 3.2}s` }}
                  />
                </g>
              );
            })}
          </svg>
          <div className="ps-sweep" />
        </div>
      </div>
      {caption ? <span className="h-cap">{caption}</span> : null}
    </div>
  );
}
