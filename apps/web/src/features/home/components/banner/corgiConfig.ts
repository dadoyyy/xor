export type BannerScene = "morning" | "afternoon" | "evening" | "night";

export interface CorgiSceneConfig {
  asset: string;
  alt: string;
  intrinsicWidth: number;
  intrinsicHeight: number;
  /** Percentage from left (default ~48-52% puts it on the flat grassy knoll right of center) */
  leftPercent: number;
  /** Pixels from bottom of card */
  bottomPx: number;
  /** Height of corgi as percentage of card height (default 70-80%) */
  heightPercent: number;
  /** Soft ground shadow ellipse styling under corgi feet */
  shadowWidthPercent: number;
  shadowHeightPx: number;
  shadowOpacity: number;
  shadowColor: string;
  shadowBottomPx: number;
}

export const BANNER_CORGI_CONFIG: Record<BannerScene, CorgiSceneConfig> = {
  morning: {
    // Waving corgi greeting you in the morning
    asset: "/mascot/welcome.webp",
    alt: "",
    intrinsicWidth: 359,
    intrinsicHeight: 374,
    leftPercent: 54.5,
    bottomPx: 14,
    heightPercent: 70,
    shadowWidthPercent: 80,
    shadowHeightPx: 12,
    shadowOpacity: 0.28,
    shadowColor: "#6B3B8A",
    shadowBottomPx: 10,
  },
  afternoon: {
    // Standing corgi with graduation cap, red scarf and backpack
    asset: "/mascot/signup/signup-main.webp",
    alt: "",
    intrinsicWidth: 1024,
    intrinsicHeight: 1024,
    leftPercent: 53.5,
    bottomPx: 12,
    heightPercent: 74,
    shadowWidthPercent: 82,
    shadowHeightPx: 13,
    shadowOpacity: 0.32,
    shadowColor: "#572675",
    shadowBottomPx: 8,
  },
  evening: {
    // Sleepy corgi winding down for the night
    asset: "/mascot/sleepy.webp",
    alt: "",
    intrinsicWidth: 350,
    intrinsicHeight: 331,
    leftPercent: 54.5,
    bottomPx: 16,
    heightPercent: 58,
    shadowWidthPercent: 85,
    shadowHeightPx: 12,
    shadowOpacity: 0.45,
    shadowColor: "#18062B",
    shadowBottomPx: 12,
  },
  night: {
    // Alias for evening
    asset: "/mascot/sleepy.webp",
    alt: "",
    intrinsicWidth: 350,
    intrinsicHeight: 331,
    leftPercent: 54.5,
    bottomPx: 16,
    heightPercent: 58,
    shadowWidthPercent: 85,
    shadowHeightPx: 12,
    shadowOpacity: 0.45,
    shadowColor: "#18062B",
    shadowBottomPx: 12,
  },
};
