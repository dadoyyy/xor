import type { CSSProperties } from "react";

// Room cover designs. Stored as an id on rooms.cover.
// Patterns are small SVGs used as repeating backgrounds (inline styles, so
// they always render regardless of CSS class scanning).

export type Cover = {
  id: string;
  label: string;
  bg: string; // base color
  pattern?: string; // CSS background-image
  size?: string; // background-size
  letter: string; // color of the big initial
};

const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;

export const COVERS: Cover[] = [
  {
    id: "dots",
    label: "Polka dots",
    bg: "#efe7ff",
    pattern: svg(20, 20, "<circle cx='5' cy='5' r='2.6' fill='#c9b3ff'/><circle cx='15' cy='15' r='2.6' fill='#c9b3ff'/>"),
    letter: "#7c3aed",
  },
  {
    id: "stripes",
    label: "Sunny stripes",
    bg: "#fff5d1",
    pattern: svg(24, 24, "<path d='M-6 18 L18 -6 M6 30 L30 6' stroke='#ffd966' stroke-width='6'/>"),
    letter: "#e0a800",
  },
  {
    id: "waves",
    label: "Waves",
    bg: "#f6f2ff",
    pattern: svg(40, 16, "<path d='M0 8 Q10 0 20 8 T40 8' fill='none' stroke='#c9b3ff' stroke-width='2.5'/>"),
    letter: "#5b21b6",
  },
  {
    id: "grid",
    label: "Grape grid",
    bg: "#7c3aed",
    pattern: svg(22, 22, "<path d='M22 0 V22 M0 22 H22' stroke='rgba(255,255,255,0.22)' stroke-width='2'/>"),
    letter: "#ffffff",
  },
  {
    id: "sparkles",
    label: "Sparkles",
    bg: "#ffcc33",
    pattern: svg(
      44,
      44,
      "<path d='M11 4l2 6 6 2-6 2-2 6-2-6-6-2 6-2z' fill='rgba(255,255,255,0.7)'/><path d='M33 26l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z' fill='rgba(255,255,255,0.55)'/>",
    ),
    letter: "#ffffff",
  },
  {
    id: "confetti",
    label: "Confetti",
    bg: "#ffffff",
    pattern: svg(
      60,
      60,
      "<rect x='6' y='8' width='8' height='4' rx='2' fill='#ffcc33' transform='rotate(20 10 10)'/><rect x='36' y='14' width='8' height='4' rx='2' fill='#7c3aed' transform='rotate(-30 40 16)'/><circle cx='20' cy='40' r='3' fill='#c9b3ff'/><rect x='42' y='42' width='8' height='4' rx='2' fill='#ff9bb8' transform='rotate(40 46 44)'/><circle cx='52' cy='4' r='2.5' fill='#ffcc33'/>",
    ),
    letter: "#7c3aed",
  },
  {
    id: "checker",
    label: "Checkers",
    bg: "#efe7ff",
    pattern: svg(24, 24, "<rect width='12' height='12' fill='#e2d6ff'/><rect x='12' y='12' width='12' height='12' fill='#e2d6ff'/>"),
    letter: "#7c3aed",
  },
  {
    id: "zigzag",
    label: "Zigzag",
    bg: "#fff5d1",
    pattern: svg(28, 14, "<path d='M0 10 L7 3 L14 10 L21 3 L28 10' fill='none' stroke='#c9b3ff' stroke-width='2.5' stroke-linejoin='round'/>"),
    letter: "#7c3aed",
  },
  {
    id: "bubbles",
    label: "Bubbles",
    bg: "#5b21b6",
    pattern: svg(
      56,
      56,
      "<circle cx='12' cy='14' r='7' fill='rgba(255,255,255,0.12)'/><circle cx='40' cy='34' r='11' fill='rgba(255,255,255,0.10)'/><circle cx='22' cy='46' r='4' fill='rgba(255,204,51,0.45)'/>",
    ),
    letter: "#ffcc33",
  },
  {
    id: "plain",
    label: "Plain",
    bg: "#f6f2ff",
    letter: "#7c3aed",
  },
];

export const COVER_IDS = COVERS.map((c) => c.id);
const FALLBACK_ORDER = ["dots", "stripes", "waves", "sparkles"];

/** Saved cover, or a stable default picked from the room id. */
export function getCover(id: string | null | undefined, roomId = ""): Cover {
  const found = COVERS.find((c) => c.id === id);
  if (found) return found;
  let h = 0;
  for (const ch of roomId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVERS.find((c) => c.id === FALLBACK_ORDER[h % FALLBACK_ORDER.length])!;
}

export function coverStyle(c: Cover): CSSProperties {
  return {
    backgroundColor: c.bg,
    backgroundImage: c.pattern,
    backgroundSize: c.size,
    boxShadow: c.bg === "#ffffff" ? "inset 0 0 0 2px var(--line)" : undefined,
  };
}
