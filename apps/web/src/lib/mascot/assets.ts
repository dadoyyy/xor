export type CorgiAssetMeta = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const CORGI_ASSETS = {
  // Logos
  "logo-icon": {
    src: "/mascot/logo-icon.webp",
    alt: "xor corgi app icon",
    width: 120,
    height: 120,
  },
  "logo-main": {
    src: "/mascot/logo-main.webp",
    alt: "xor corgi study logo",
    width: 160,
    height: 140,
  },
  "logo-stacked": {
    src: "/mascot/logo-stacked.webp",
    alt: "xor mascot brand logo",
    width: 240,
    height: 240,
  },
  "hero-squad": {
    src: "/mascot/hero-squad.webp",
    alt: "xor corgi study squad companions",
    width: 897,
    height: 669,
  },
  "standing": {
    src: "/mascot/signup/signup-main.webp",
    alt: "Standing scholar corgi mascot with backpack and cap",
    width: 400,
    height: 400,
  },

  // Empty states & Guides
  "welcome": {
    src: "/mascot/welcome.webp",
    alt: "Corgi happily welcoming you to xor",
    width: 400,
    height: 400,
  },
  "empty-state": {
    src: "/mascot/empty-state.webp",
    alt: "Corgi waiting with an open notebook",
    width: 400,
    height: 400,
  },
  "error-loading": {
    src: "/mascot/error-loading.webp",
    alt: "Corgi puzzled with an alert",
    width: 400,
    height: 400,
  },
  "upload-pdf": {
    src: "/mascot/upload-pdf.webp",
    alt: "Corgi carrying lecture slides",
    width: 400,
    height: 400,
  },
  "flashcards": {
    src: "/mascot/flashcards.webp",
    alt: "Corgi studying flashcards",
    width: 400,
    height: 400,
  },
  "quiz-time": {
    src: "/mascot/quiz-time.webp",
    alt: "Corgi taking a quiz with pencil",
    width: 400,
    height: 400,
  },

  // Expressions & Moods
  "happy": {
    src: "/mascot/happy.webp",
    alt: "Smiling study corgi",
    width: 400,
    height: 400,
  },
  "thinking": {
    src: "/mascot/thinking.webp",
    alt: "Corgi deep in thought pondering questions",
    width: 400,
    height: 400,
  },
  "proud": {
    src: "/mascot/proud.webp",
    alt: "Proud corgi celebrating your accomplishment",
    width: 400,
    height: 400,
  },
  "excited": {
    src: "/mascot/excited.webp",
    alt: "Excited corgi ready to study",
    width: 400,
    height: 400,
  },
  "cheering": {
    src: "/mascot/cheering.webp",
    alt: "Cheering corgi with graduation confetti",
    width: 400,
    height: 400,
  },
  "sleepy": {
    src: "/mascot/sleepy.webp",
    alt: "Resting sleepy corgi taking a break",
    width: 400,
    height: 400,
  },
  "confused": {
    src: "/mascot/confused.webp",
    alt: "Confused corgi looking for direction",
    width: 400,
    height: 400,
  },
  "sad": {
    src: "/mascot/sad.webp",
    alt: "Sad corgi needing a little encouragement",
    width: 400,
    height: 400,
  },
  "winking": {
    src: "/mascot/winking.webp",
    alt: "Winking corgi cheering you on",
    width: 400,
    height: 400,
  },

  // Milestone Badges
  "streak-7": {
    src: "/mascot/streak-7.webp",
    alt: "7-Day Study Streak Badge with flame",
    width: 200,
    height: 200,
  },
  "first-room": {
    src: "/mascot/first-room.webp",
    alt: "First Subject Created Badge",
    width: 200,
    height: 200,
  },
  "joined-room": {
    src: "/mascot/joined-room.webp",
    alt: "Joined Subject Collaborator Badge",
    width: 200,
    height: 200,
  },
  "flashcard-master": {
    src: "/mascot/flashcard-master.webp",
    alt: "Flashcard Master Badge",
    width: 200,
    height: 200,
  },
  "perfect-score": {
    src: "/mascot/perfect-score.webp",
    alt: "100% Perfect Quiz Score Badge",
    width: 200,
    height: 200,
  },
  "leaderboard-1st": {
    src: "/mascot/leaderboard-1st.webp",
    alt: "1st Place Leaderboard Gold Trophy Badge",
    width: 200,
    height: 200,
  },
} as const satisfies Record<string, CorgiAssetMeta>;

export type CorgiAssetKey = keyof typeof CORGI_ASSETS;

