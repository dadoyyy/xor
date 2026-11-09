export const colors = {
  lilac: "#f7f3ff",
  ink: "#2b2545",
  inkSoft: "#6e6790",
  grape: "#7c3aed",
  grapeDeep: "#5b21b6",
  grapeTint: "#ede4ff",
  sun: "#ffcc33",
  sunDeep: "#e0a800",
  sunTint: "#fff5d1",
  coral: "#e5484d",
  coralTint: "#ffe5e7",
  mint: "#16a34a",
  mintTint: "#dcfce7",
  line: "#e6def8",
  white: "#ffffff",
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  card: 22,
  full: 9999,
} as const;

export const typography = {
  fontSans: '"Nunito Variable", ui-rounded, system-ui, sans-serif',
  fontDisplay: '"Fredoka Variable", "Nunito Variable", ui-rounded, system-ui, sans-serif',
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;

