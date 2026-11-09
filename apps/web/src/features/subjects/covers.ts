import type { CSSProperties } from "react";

export type CoverKind = "image" | "pattern";
export type CoverCategory = "corgi" | "pattern";

export type CoverDefinition = {
  id: string;
  label: string;
  category: CoverCategory;
  kind: CoverKind;
  // Image properties
  src?: string;
  thumb?: string;
  // Pattern properties
  bg?: string;
  pattern?: string;
  size?: string;
  letter?: string;
};

const svg = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`
  )}")`;

// Known built assets that currently have WebP files available
export const BUILT_COVER_IDS = new Set([
  "corgi-reading",
  "corgi-science",
  "corgi-math",
  "corgi-coding",
  "corgi-art",
  "corgi-language",
  "corgi-space",
  "corgi-team",
  "corgi-sleepy",
]);

export const COVERS: CoverDefinition[] = [
  // 1. Corgi-themed Illustrated Covers
  {
    id: "corgi-reading",
    label: "Reading corner",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-reading.webp",
    thumb: "/mascot/covers/thumbs/corgi-reading.webp",
  },
  {
    id: "corgi-science",
    label: "Science lab",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-science.webp",
    thumb: "/mascot/covers/thumbs/corgi-science.webp",
  },
  {
    id: "corgi-math",
    label: "Math class",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-math.webp",
    thumb: "/mascot/covers/thumbs/corgi-math.webp",
  },
  {
    id: "corgi-coding",
    label: "Code mode",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-coding.webp",
    thumb: "/mascot/covers/thumbs/corgi-coding.webp",
  },
  {
    id: "corgi-art",
    label: "Art studio",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-art.webp",
    thumb: "/mascot/covers/thumbs/corgi-art.webp",
  },
  {
    id: "corgi-music",
    label: "Music",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-music.webp",
    thumb: "/mascot/covers/thumbs/corgi-music.webp",
  },
  {
    id: "corgi-history",
    label: "History",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-history.webp",
    thumb: "/mascot/covers/thumbs/corgi-history.webp",
  },
  {
    id: "corgi-language",
    label: "Languages",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-language.webp",
    thumb: "/mascot/covers/thumbs/corgi-language.webp",
  },
  {
    id: "corgi-nature",
    label: "Nature",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-nature.webp",
    thumb: "/mascot/covers/thumbs/corgi-nature.webp",
  },
  {
    id: "corgi-space",
    label: "Space",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-space.webp",
    thumb: "/mascot/covers/thumbs/corgi-space.webp",
  },
  {
    id: "corgi-night-study",
    label: "Night study",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-night-study.webp",
    thumb: "/mascot/covers/thumbs/corgi-night-study.webp",
  },
  {
    id: "corgi-team",
    label: "Study team",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-team.webp",
    thumb: "/mascot/covers/thumbs/corgi-team.webp",
  },
  {
    id: "corgi-sleepy",
    label: "Nap time",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-sleepy.webp",
    thumb: "/mascot/covers/thumbs/corgi-sleepy.webp",
  },
  {
    id: "paw-pattern",
    label: "Paw prints",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/paw-pattern.webp",
    thumb: "/mascot/covers/thumbs/paw-pattern.webp",
  },
  {
    id: "bone-pattern",
    label: "Bones",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/bone-pattern.webp",
    thumb: "/mascot/covers/thumbs/bone-pattern.webp",
  },
  {
    id: "corgi-faces",
    label: "Corgi faces",
    category: "corgi",
    kind: "image",
    src: "/mascot/covers/corgi-faces.webp",
    thumb: "/mascot/covers/thumbs/corgi-faces.webp",
  },

  // 2. Existing Generic Pattern Covers (Preserved Exactly)
  {
    id: "dots",
    label: "Polka dots",
    category: "pattern",
    kind: "pattern",
    bg: "#efe7ff",
    pattern: svg(
      20,
      20,
      "<circle cx='5' cy='5' r='2.6' fill='#c9b3ff'/><circle cx='15' cy='15' r='2.6' fill='#c9b3ff'/>"
    ),
    letter: "#7c3aed",
  },
  {
    id: "stripes",
    label: "Sunny stripes",
    category: "pattern",
    kind: "pattern",
    bg: "#fff5d1",
    pattern: svg(
      24,
      24,
      "<path d='M-6 18 L18 -6 M6 30 L30 6' stroke='#ffd966' stroke-width='6'/>"
    ),
    letter: "#e0a800",
  },
  {
    id: "waves",
    label: "Waves",
    category: "pattern",
    kind: "pattern",
    bg: "#f6f2ff",
    pattern: svg(
      40,
      16,
      "<path d='M0 8 Q10 0 20 8 T40 8' fill='none' stroke='#c9b3ff' stroke-width='2.5'/>"
    ),
    letter: "#5b21b6",
  },
  {
    id: "grid",
    label: "Grape grid",
    category: "pattern",
    kind: "pattern",
    bg: "#7c3aed",
    pattern: svg(
      22,
      22,
      "<path d='M22 0 V22 M0 22 H22' stroke='rgba(255,255,255,0.22)' stroke-width='2'/>"
    ),
    letter: "#ffffff",
  },
  {
    id: "sparkles",
    label: "Sparkles",
    category: "pattern",
    kind: "pattern",
    bg: "#ffcc33",
    pattern: svg(
      44,
      44,
      "<path d='M11 4l2 6 6 2-6 2-2 6-2-6-6-2 6-2z' fill='rgba(255,255,255,0.7)'/><path d='M33 26l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z' fill='rgba(255,255,255,0.55)'/>"
    ),
    letter: "#ffffff",
  },
  {
    id: "confetti",
    label: "Confetti",
    category: "pattern",
    kind: "pattern",
    bg: "#ffffff",
    pattern: svg(
      60,
      60,
      "<rect x='6' y='8' width='8' height='4' rx='2' fill='#ffcc33' transform='rotate(20 10 10)'/><rect x='36' y='14' width='8' height='4' rx='2' fill='#7c3aed' transform='rotate(-30 40 16)'/><circle cx='20' cy='40' r='3' fill='#c9b3ff'/><rect x='42' y='42' width='8' height='4' rx='2' fill='#ff9bb8' transform='rotate(40 46 44)'/><circle cx='52' cy='4' r='2.5' fill='#ffcc33'/>"
    ),
    letter: "#7c3aed",
  },
  {
    id: "checker",
    label: "Checkers",
    category: "pattern",
    kind: "pattern",
    bg: "#efe7ff",
    pattern: svg(
      24,
      24,
      "<rect width='12' height='12' fill='#e2d6ff'/><rect x='12' y='12' width='12' height='12' fill='#e2d6ff'/>"
    ),
    letter: "#7c3aed",
  },
  {
    id: "zigzag",
    label: "Zigzag",
    category: "pattern",
    kind: "pattern",
    bg: "#fff5d1",
    pattern: svg(
      28,
      14,
      "<path d='M0 10 L7 3 L14 10 L21 3 L28 10' fill='none' stroke='#c9b3ff' stroke-width='2.5' stroke-linejoin='round'/>"
    ),
    letter: "#7c3aed",
  },
  {
    id: "bubbles",
    label: "Bubbles",
    category: "pattern",
    kind: "pattern",
    bg: "#5b21b6",
    pattern: svg(
      56,
      56,
      "<circle cx='12' cy='14' r='7' fill='rgba(255,255,255,0.12)'/><circle cx='40' cy='34' r='11' fill='rgba(255,255,255,0.10)'/><circle cx='22' cy='46' r='4' fill='rgba(255,204,51,0.45)'/>"
    ),
    letter: "#ffcc33",
  },
  {
    id: "plain",
    label: "Plain",
    category: "pattern",
    kind: "pattern",
    bg: "#f6f2ff",
    letter: "#7c3aed",
  },
];

export const CORGI_COVERS = COVERS.filter((c) => c.category === "corgi");
export const PATTERN_COVERS = COVERS.filter((c) => c.category === "pattern");
export const COVER_IDS = COVERS.map((c) => c.id);

/**
 * Validates that an ID is syntactically valid per database check: ^[a-z0-9-]{1,24}$
 */
export function isValidCoverId(id: string): boolean {
  return /^[a-z0-9-]{1,24}$/.test(id);
}

/**
 * Returns a stable integer hash for a string (such as subjectId or roomId)
 */
export function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministically pick a corgi cover for a given subject ID
 */
export function getDeterministicCorgiCover(subjectId = ""): CoverDefinition {
  const h = hashString(subjectId || "default-subject");
  return CORGI_COVERS[h % CORGI_COVERS.length] || CORGI_COVERS[0];
}

/**
 * Saved cover, or a stable deterministic corgi default picked from the subject id.
 * Unknown or missing IDs also safely fall back to the deterministic default.
 */
export function getCover(id: string | null | undefined, subjectId = ""): CoverDefinition {
  if (id) {
    const found = COVERS.find((c) => c.id === id);
    if (found) return found;
  }
  return getDeterministicCorgiCover(subjectId);
}

/**
 * Checks whether the image asset for this cover is built and available.
 */
export function hasCoverAsset(id: string): boolean {
  return BUILT_COVER_IDS.has(id);
}

/**
 * CSS background styles for pattern covers or image fallback
 */
export function coverStyle(c: CoverDefinition): CSSProperties {
  if (c.kind === "pattern") {
    return {
      backgroundColor: c.bg,
      backgroundImage: c.pattern,
      backgroundSize: c.size,
      boxShadow: c.bg === "#ffffff" ? "inset 0 0 0 2px var(--line)" : undefined,
    };
  }

  // Placeholder styling for image covers without source yet
  return {
    backgroundColor: "#EFE9FF",
  };
}

/**
 * Picks a random cover from the catalog (different from currentId)
 */
export function getRandomCover(currentId?: string): CoverDefinition {
  const candidates = COVERS.filter((c) => c.id !== currentId);
  if (candidates.length === 0) return COVERS[0];
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

