import type { BannerScene } from "./corgiConfig";

export interface SceneCompositionConfig {
  /** Book stack configuration */
  books: {
    /** Target center X coordinate in 1600-wide viewBox (approx 46-58% of card width) */
    targetX: number;
    /** Target base Y coordinate in 560-high viewBox */
    targetY: number;
    /** Scale relative to original (specified: ~85%) */
    scale: number;
    /** Atmospheric opacity for distant depth */
    opacity: number;
  };
  /** Cottage configuration */
  cottage: {
    /** Center X offset from original (1105) in 1600-wide viewBox */
    offsetX: number;
    /** Center Y offset */
    offsetY: number;
    /** Scale */
    scale: number;
  };
  /** Standing Corgi configuration (CSS relative to banner card) */
  corgi: {
    /** Inset percentage from right edge (specified: ~3%) */
    rightPercent: number;
    /** Bottom offset in px (standing on front hill line) */
    bottomPx: number;
    /** Height percentage of card height (specified: 70-78%) */
    heightPercent: number;
    /** Soft ground shadow ellipse properties */
    shadowWidthPercent: number;
    shadowHeightPx: number;
    shadowOpacity: number;
    shadowColor: string;
    shadowBottomPx: number;
  };
}

/**
 * Shared composition configuration per time-of-day scene.
 * Tweak these numbers to adjust layout without altering SVG path coordinates.
 */
export const SCENE_COMPOSITION_CONFIG: Record<BannerScene, SceneCompositionConfig> = {
  morning: {
    books: {
      targetX: 900, // 56.25% of 1600 (within 46-58% range)
      targetY: 410,
      scale: 0.85,
      opacity: 0.94,
    },
    cottage: {
      offsetX: 35, // centered around x=1140 (71.25% of 1600, within 62-74% range)
      offsetY: 0,
      scale: 1,
    },
    corgi: {
      rightPercent: 3, // 3% inset from right edge
      bottomPx: 4,
      heightPercent: 68, // within ~70% range
      shadowWidthPercent: 82,
      shadowHeightPx: 12,
      shadowOpacity: 0.28,
      shadowColor: "#6B3B8A",
      shadowBottomPx: 4,
    },
  },
  afternoon: {
    books: {
      targetX: 900, // 56.25% of 1600 (within 46-58% range)
      targetY: 410,
      scale: 0.85,
      opacity: 0.94,
    },
    cottage: {
      offsetX: 35, // centered around x=1140 (71.25% of 1600, within 62-74% range)
      offsetY: 0,
      scale: 1,
    },
    corgi: {
      rightPercent: 3, // 3% inset from right edge
      bottomPx: 4,
      heightPercent: 68, // within ~70% range
      shadowWidthPercent: 82,
      shadowHeightPx: 12,
      shadowOpacity: 0.32,
      shadowColor: "#572675",
      shadowBottomPx: 4,
    },
  },
  evening: {
    books: {
      targetX: 900, // 56.25% of 1600 (within 46-58% range)
      targetY: 410,
      scale: 0.85,
      opacity: 0.94,
    },
    cottage: {
      offsetX: 35, // centered around x=1140 (71.25% of 1600, within 62-74% range)
      offsetY: 0,
      scale: 1,
    },
    corgi: {
      rightPercent: 3, // 3% inset from right edge
      bottomPx: 4,
      heightPercent: 68, // within ~70% range
      shadowWidthPercent: 85,
      shadowHeightPx: 12,
      shadowOpacity: 0.45,
      shadowColor: "#18062B",
      shadowBottomPx: 4,
    },
  },
  night: {
    books: {
      targetX: 900,
      targetY: 410,
      scale: 0.85,
      opacity: 0.94,
    },
    cottage: {
      offsetX: 35,
      offsetY: 0,
      scale: 1,
    },
    corgi: {
      rightPercent: 3,
      bottomPx: 4,
      heightPercent: 68,
      shadowWidthPercent: 85,
      shadowHeightPx: 12,
      shadowOpacity: 0.45,
      shadowColor: "#18062B",
      shadowBottomPx: 4,
    },
  },
};
