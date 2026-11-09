import type { QType, Response } from "@/types/questions";
import type { QuizDifficulty } from "../types";

export async function createQuiz(
  subjectId: string,
  payload: {
    materialIds: string[];
    types: QType[];
    count: number;
    difficulty: QuizDifficulty;
    timeLimitMinutes: number | null;
    title?: string;
    instructions?: string;
  },
): Promise<{ id: string }> {
  const res = await fetch(`/api/subjects/${subjectId}/quizzes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Couldn't make the quiz.");
  return { id: body.id as string };
}

export async function startQuizAttempt(quizId: string): Promise<{ id: string }> {
  const res = await fetch(`/api/quizzes/${quizId}/attempts`, { method: "POST" });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Couldn't start the quiz.");
  return { id: body.id as string };
}

export async function submitQuizAttempt(
  attemptId: string,
  answers: Record<string, Response>
): Promise<{ id: string; status: string; score: number; maxScore: number; streak?: any }> {
  const res = await fetch(`/api/attempts/${attemptId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Couldn't submit.");
  return body;
}
