/**
 * Inline stroke icon set (from the approved mock — same 24px stroke style).
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function CowIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M2 20c6-2 14-2 20 0" />
      <path d="M4 17l1.4-6.5A4 4 0 0 1 9.3 7.5h.2a3.5 3.5 0 0 1 6.6 0h.2a4 4 0 0 1 3.9 3l1.4 6.5" />
      <path d="M9.5 12.5v4M14.5 12.5v4M12 12v4" />
    </svg>
  );
}

export function GridIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function RowsIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function HerdIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M4 20c6-2 10-2 16 0" />
      <path d="M5 16l1-5.5a3 3 0 0 1 2.9-2.3h.2a2.6 2.6 0 0 1 5 0h.2a3 3 0 0 1 2.9 2.3l1 5.5" />
    </svg>
  );
}

export function TriageIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
