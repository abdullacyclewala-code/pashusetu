import map from "@/lib/map/maharashtra.json";

/**
 * Live surveillance map of Maharashtra.
 * Pure SVG + CSS animation (no canvas, no rAF, no client JS):
 * the real state outline with the 15 pilot villages as breathing
 * sensor dots, data arcs flowing to the department hub (Mumbai),
 * and one pulsing "alert" village. Renders on the server.
 */

const ALERT_INDEX = 2; // Baramati — the demo outbreak village

function arcPath(x1: number, y1: number, x2: number, y2: number) {
  // gentle quadratic curve lifted perpendicular to the chord
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
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" fill="none">
        {/* state body */}
        <path
          d={path}
          fill="rgba(243, 201, 107, 0.05)"
          stroke="rgba(226, 206, 160, 0.4)"
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
                ? "rgba(224, 122, 74, 0.45)"
                : "rgba(200, 214, 156, 0.22)"
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
      {caption ? <span className="h-cap">{caption}</span> : null}
    </div>
  );
}
