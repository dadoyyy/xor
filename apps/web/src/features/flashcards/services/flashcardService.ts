import type { StreakSummary } from "@/types/subject";
import type { DeckDifficulty } from "../types";

export async function createFlashcardDeck(
  subjectId: string,
  payload: {
    materialIds: string[];
    count: number;
    difficulty: DeckDifficulty;
    title?: string;
    instructions?: string;
  },
): Promise<{ id: string }> {
  const res = await fetch(`/api/subjects/${subjectId}/decks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Couldn't make the deck.");
  return { id: body.id as string };
}

export async function logDeckReview(
  deckId: string,
  cardIds: string[],
): Promise<({ ok: boolean; cardsReviewed: number } & StreakSummary) | null> {
  if (!deckId || !cardIds.length) return null;
  const res = await fetch(`/api/decks/${deckId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cardIds }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { ok: boolean; cardsReviewed: number } & StreakSummary;
}
