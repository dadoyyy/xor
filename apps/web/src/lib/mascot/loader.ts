export type CorgiLoaderVariant =
  | "default"
  | "reading"
  | "flashcards"
  | "grading"
  | "waiting";

export const CORGI_LOADER_FRAMES: Record<CorgiLoaderVariant, readonly string[]> = {
  default: ["/mascot/happy-open.png", "/mascot/happy-blink.png"],
  reading: [
    "/mascot/reading-1.png",
    "/mascot/reading-2.png",
    "/mascot/reading-3.png",
  ],
  flashcards: [
    "/mascot/flashcards-1.png",
    "/mascot/flashcards-2.png",
    "/mascot/flashcards-3.png",
  ],
  grading: [
    "/mascot/grading-1.png",
    "/mascot/grading-2.png",
    "/mascot/grading-3.png",
  ],
  waiting: ["/mascot/waiting-1.png", "/mascot/waiting-2.png"],
} as const;

export const CORGI_LOADER_MESSAGES: Record<CorgiLoaderVariant, readonly string[]> = {
  default: [
    "Getting your subjects ready…",
    "Fetching your subjects and streaks…",
    "Almost ready to study…",
  ],
  reading: [
    "Scanning your PDF pages…",
    "Spotting key definitions and formulas…",
    "Reading through lecture notes…",
  ],
  flashcards: [
    "Shuffling your new flashcard deck…",
    "Writing front-and-back study cards…",
    "Stacking fresh flashcards for your subject…",
  ],
  grading: [
    "Grading your answers carefully…",
    "Checking every point and explanation…",
    "Tallying up your score…",
  ],
  waiting: [
    "Hang tight, just a moment…",
    "Keeping your place warm…",
    "Waiting on the next step…",
  ],
} as const;

