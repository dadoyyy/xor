import type { RoomSection, SubjectSection } from "@xor/shared-types";

export const MOBILE_SUBJECT_TABS: readonly SubjectSection[] = [
  "materials",
  "quizzes",
  "flashcards",
  "leaderboard",
  "sharing",
] as const;

export const MOBILE_ROOM_TABS: readonly RoomSection[] = [
  "materials",
  "quizzes",
  "flashcards",
  "leaderboard",
  "members",
] as const;
