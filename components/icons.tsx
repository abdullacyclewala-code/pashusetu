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

export function BellIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function CloudOffIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M22 16.5a4.5 4.5 0 0 0-3.5-4.4A7 7 0 0 0 7.7 7.3" />
      <path d="M4.6 8.6A7 7 0 0 0 4 11a4.5 4.5 0 0 0 .5 9h11" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function LangIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1" />
      <path d="M22 22l-5-10-5 10M14 18h6" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.9} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2l2.4 2.4 4.6-5" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.2} className={className}>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function ClipboardIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 2.5h6v3H9zM9 10.5h6M9 14h6M9 17.5h3.5" />
    </svg>
  );
}

export function FileChartIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z" />
      <path d="M14 2.5V7.5h5" />
      <path d="M9 17v-3M12 17v-5.5M15 17v-2" />
    </svg>
  );
}

export function AlertTriangleIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M10.3 3.9L2.6 17.3a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4.5M12 17.5h.01" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M4 7.5h2.5l1.8-2.5h7.4l1.8 2.5H20a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5V9A1.5 1.5 0 0 1 4 7.5z" />
      <circle cx="12" cy="13.5" r="3.6" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function VolumeIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.6} className={className}>
      <path d="M11 5.5 6.5 9H3.5v6h3l4.5 3.5v-13z" />
      <path d="M15.5 8.8a4.6 4.6 0 0 1 0 6.4M18 6.3a7.6 7.6 0 0 1 0 11.4" />
    </svg>
  );
}

export function StopIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.6} className={className}>
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

export function FlaskIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M9 3h6M10 3v6.2L4.7 17.6A2 2 0 0 0 6.4 20h11.2a2 2 0 0 0 1.7-2.4L14 9.2V3" />
      <path d="M7.2 15h9.6" />
    </svg>
  );
}

export function SyringeIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M18.2 3.8l2 2M16.2 5.8l2 2M14 8l4.5 4.5-2 2L12 9.5z" />
      <path d="M4 20l5.5-5.5M12 9.5L4 17.5l-1 3 3-1 8-8" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.7} className={className}>
      <path d="M12 3l8 3v5.5c0 4.5-3.4 7.9-8 9.5-4.6-1.6-8-5-8-9.5V6z" />
      <path d="M9 12l2 2 4-4.5" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}
