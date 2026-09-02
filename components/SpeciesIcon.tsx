import type { SpeciesKey } from "@/lib/report/constants";

/**
 * Minimal line-drawn species icons (24×24 stroke style, no emoji).
 * Deliberately simple silhouettes so they read at small sizes and
 * match the icon set in components/icons.tsx.
 */

interface Props {
  species: SpeciesKey | (string & {});
  className?: string;
}

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Cattle({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      {/* horns */}
      <path d="M6.5 5C4.8 5 3.6 3.9 3.4 2.6M17.5 5c1.7 0 2.9-1.1 3.1-2.4" />
      {/* head */}
      <path d="M6.5 5h11l1 5.5-2.4 2-1.1 5A2.5 2.5 0 0 1 12.5 19.6h-1a2.5 2.5 0 0 1-2.5-2.1l-1.1-5-2.4-2z" />
      {/* ears */}
      <path d="M5.5 10.5L2.5 9M18.5 10.5l3-1.5" />
      {/* eyes + muzzle */}
      <path d="M9.3 9.3h.01M14.7 9.3h.01M10 16h.01M14 16h.01" strokeWidth={2.2} />
      <path d="M9 14.2h6" />
    </svg>
  );
}

function Buffalo({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      {/* swept-back horns */}
      <path d="M7 6C4.5 6.5 2.6 5 2.4 2.8c2.2-.2 4 .8 4.9 2.6M17 6c2.5.5 4.4-1 4.6-3.2-2.2-.2-4 .8-4.9 2.6" />
      <path d="M7 6h10l1.2 5-2.5 2.1-1 4.6a2.5 2.5 0 0 1-2.4 2h-.6a2.5 2.5 0 0 1-2.4-2l-1-4.6L5.8 11z" />
      <path d="M9.5 9.6h.01M14.5 9.6h.01M10.2 15.8h.01M13.8 15.8h.01" strokeWidth={2.2} />
      <path d="M9.3 14h5.4" />
    </svg>
  );
}

function Goat({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      {/* upright horns */}
      <path d="M9 5.5C8 4.5 7.7 3 8 1.8M15 5.5c1-1 1.3-2.5 1-3.7" />
      {/* narrow face */}
      <path d="M9 5.5h6l1.6 4.3-1.3 1.7-.8 4.4a2.4 2.4 0 0 1-2.4 2h-.2a2.4 2.4 0 0 1-2.4-2l-.8-4.4-1.3-1.7z" />
      {/* droopy ears */}
      <path d="M7.4 9.8C5.8 10.4 4.6 11.6 4.2 13M16.6 9.8c1.6.6 2.8 1.8 3.2 3.2" />
      {/* eyes, beard */}
      <path d="M10.4 9.3h.01M13.6 9.3h.01" strokeWidth={2.2} />
      <path d="M12 17.9v3" />
    </svg>
  );
}

function Sheep({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      {/* woolly crown */}
      <path d="M7.5 7.5a2.6 2.6 0 0 1 1.2-3.4 2.6 2.6 0 0 1 3.3-1.6 2.6 2.6 0 0 1 3.3 1.6 2.6 2.6 0 0 1 1.2 3.4" />
      {/* face */}
      <path d="M7.5 7.5h9l1 3.8-1.4 1.6-.7 4.2a2.4 2.4 0 0 1-2.4 2h-2a2.4 2.4 0 0 1-2.4-2l-.7-4.2-1.4-1.6z" />
      {/* side wool ears */}
      <path d="M6.2 11.2c-1.4 0-2.4-.9-2.6-2M17.8 11.2c1.4 0 2.4-.9 2.6-2" />
      <path d="M10.3 11h.01M13.7 11h.01" strokeWidth={2.2} />
    </svg>
  );
}

function Pig({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      {/* ears */}
      <path d="M6 7.5L4.6 3.8 8.5 5M18 7.5l1.4-3.7L15.5 5" />
      {/* round face */}
      <circle cx="12" cy="12.5" r="7.5" />
      {/* snout */}
      <rect x="8.8" y="12.2" width="6.4" height="4.4" rx="2.2" />
      <path d="M10.9 14.4h.01M13.1 14.4h.01" strokeWidth={2.2} />
      {/* eyes */}
      <path d="M9.2 9.8h.01M14.8 9.8h.01" strokeWidth={2.2} />
    </svg>
  );
}

function Poultry({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      {/* comb */}
      <path d="M10.2 5.2c-.2-1.4.5-2.6 1.8-3 .2 1 .9 1.7 1.9 1.9-.1 1-.7 1.8-1.6 2.1" />
      {/* head + beak */}
      <circle cx="12.6" cy="8.4" r="2.6" />
      <path d="M15.2 8.2l2.3.8-2.4.9" />
      <path d="M12 7.9h.01" strokeWidth={2.2} />
      {/* body */}
      <path d="M13.6 13.3a5.4 5.4 0 1 1-8.2 4.6c0-3 2.4-5.4 5.4-5.4.5 0 1 .06 1.4.2" />
      <path d="M12.1 10.9l1.5 2.4" />
      {/* tail feathers */}
      <path d="M4.4 15.2c-1.2-.6-2-1.7-2.2-3M5.6 13c-.8-.8-1.2-1.9-1.1-3.1" />
    </svg>
  );
}

function Paw({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 11.5c2.6 0 5 2 5.6 4.6.3 1.5-.8 2.9-2.3 2.9-1.2 0-2.1-.8-3.3-.8s-2.1.8-3.3.8c-1.5 0-2.6-1.4-2.3-2.9C7 13.5 9.4 11.5 12 11.5z" />
      <ellipse cx="7" cy="9.2" rx="1.7" ry="2.2" />
      <ellipse cx="17" cy="9.2" rx="1.7" ry="2.2" />
      <ellipse cx="10.2" cy="6.4" rx="1.6" ry="2.1" />
      <ellipse cx="13.8" cy="6.4" rx="1.6" ry="2.1" />
    </svg>
  );
}

const MAP: Record<string, (p: { className?: string }) => React.ReactElement> = {
  cattle: Cattle,
  buffalo: Buffalo,
  goat: Goat,
  sheep: Sheep,
  pig: Pig,
  poultry: Poultry,
  other: Paw,
};

export function SpeciesIcon({ species, className }: Props) {
  const Icon = MAP[species] ?? Paw;
  return <Icon className={className} />;
}
