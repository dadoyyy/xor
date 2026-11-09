export type QuizDifficulty = "easy" | "medium" | "hard" | "mixed";

export type TakeQuestion = {
  id: string;
  position: number;
  qtype: string;
  prompt: string;
  choices: { options?: string[]; count?: number; left?: string[]; right?: string[] } | null;
  points: number;
};

export type Choices = { options?: string[]; left?: string[]; right?: string[] } | null;
export type Resp = Record<string, unknown> | null;

