/* Inline SVG icons, original line-art set. */
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const PinFrom = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);
export const PinTo = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
export const Mail = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M4 7l8 6 8-6" />
  </svg>
);
export const Cal = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="17" rx="3" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
);
export const User = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);
export const Search = (p: P) => (
  <svg {...base({ strokeWidth: 2.2, ...p })}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
export const Chevron = (p: P) => (
  <svg {...base({ strokeWidth: 2.4, ...p })} className={`chev ${p.className ?? ""}`}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const Star = (p: P) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="m12 2 3 6.5 7 .7-5.2 4.7 1.5 6.9L12 17.8 5.7 20.8l1.5-6.9L2 9.2l7-.7z" />
  </svg>
);
export const Bolt = (p: P) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
  </svg>
);
export const Shield = (p: P) => (
  <svg {...base({ width: 16, height: 16, ...p })}>
    <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const Ac = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2v20M4 6l16 12M20 6 4 18" />
  </svg>
);
export const Music = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18V5l11-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="17" cy="16" r="3" />
  </svg>
);
export const Pet = (p: P) => (
  <svg {...base(p)}>
    <circle cx="5" cy="11" r="2" />
    <circle cx="9" cy="6" r="2" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="19" cy="11" r="2" />
    <path d="M12 11c-3 0-5 2.5-5 5 0 2 1.5 3 3 3 1 0 1.5-.5 2-.5s1 .5 2 .5c1.5 0 3-1 3-3 0-2.5-2-5-5-5z" />
  </svg>
);
export const Seat = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 11V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
    <path d="M5 11h11a3 3 0 0 1 3 3v3M5 11a3 3 0 0 0-3 3v3M7 21v-2M17 21v-2" />
  </svg>
);
export const Menu = (p: P) => (
  <svg {...base({ strokeWidth: 2.2, width: 24, height: 24, ...p })}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const Tick = (p: P) => (
  <svg {...base({ strokeWidth: 3, ...p })}>
    <path d="m5 13 4 4L19 7" />
  </svg>
);

export const Home = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
    <path d="M10 20.5V14h4v6.5" />
  </svg>
);
export const Plus = (p: P) => (
  <svg {...base({ strokeWidth: 2.6, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Ticket = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 1 0-4z" />
    <path d="M14 6v12" strokeDasharray="2 2" />
  </svg>
);

export const Logo = (p: P) => (
  <svg viewBox="0 0 48 48" fill="none" width={34} height={34} {...p}>
    <rect width="48" height="48" rx="13" fill="#0071eb" />
    <path
      d="M14 30c0-3.3 2.7-6 6-6h2.5c2.5 0 4.5-2 4.5-4.5S25 15 22.5 15H16"
      stroke="#9ef769"
      strokeWidth="3.4"
      strokeLinecap="round"
    />
    <circle cx="33" cy="20" r="3.6" fill="#2dbeff" />
    <circle cx="16" cy="33" r="3.6" fill="#fff" />
  </svg>
);

export const Car = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
    <path d="M3 11h18v5H3z" />
    <circle cx="7" cy="17" r="1.5" />
    <circle cx="17" cy="17" r="1.5" />
  </svg>
);

export const Auto = (p: P) => (
  <svg {...base(p)}>
    {/* Tuk-tuk style cabin: slanted front, boxy back */}
    <path d="M4 16V10a3 3 0 0 1 3-3h7l4 4v5" />
    <path d="M7 11h7" />
    <circle cx="8" cy="17" r="1.5" />
    <circle cx="17" cy="17" r="1.5" />
  </svg>
);
