export type Section = "materials" | "quizzes" | "flashcards" | "leaderboard" | "members" | "sharing";
export type RoomSection = Section;

export type Updates = Partial<Record<Section, number>>;

export type RoomUpdates = {
  materials: number;
  quizzes: number;
  flashcards: number;
  members: number;
  sharing?: number;
  hasPoll: boolean;
  total: number;
};
