import type { QType, Response, StreakSummary } from "@xor/shared-types";

export type ApiClientConfig = {
  baseUrl?: string;
  headers?: Record<string, string>;
};

export type CreateDeckPayload = {
  materialIds: string[];
  count: number;
  difficulty: "easy" | "medium" | "hard";
  title?: string;
  instructions?: string;
};

export type CreateQuizPayload = {
  materialIds: string[];
  types: QType[];
  count: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  timeLimitMinutes: number | null;
  title?: string;
  instructions?: string;
};

export function createApiClient(config: ApiClientConfig = {}) {
  const base = (config.baseUrl ?? "").replace(/\/$/, "");

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
        ...init?.headers,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
    }
    return body as T;
  }

  return {
    materials: {
      process: (id: string) => request<{ ok: boolean; status: string }>(`/api/materials/${id}/process`, { method: "POST" }),
      remove: (id: string) => request<{ ok: boolean }>(`/api/materials/${id}`, { method: "DELETE" }),
    },
    decks: {
      create: (subjectId: string, payload: CreateDeckPayload) =>
        request<{ id: string }>(`/api/subjects/${subjectId}/decks`, { method: "POST", body: JSON.stringify(payload) }),
      logReview: (deckId: string, cardIds: string[]) =>
        request<{ ok: boolean; cardsReviewed: number } & StreakSummary>(`/api/decks/${deckId}/review`, {
          method: "POST",
          body: JSON.stringify({ cardIds }),
        }),
    },
    quizzes: {
      create: (subjectId: string, payload: CreateQuizPayload) =>
        request<{ id: string }>(`/api/subjects/${subjectId}/quizzes`, { method: "POST", body: JSON.stringify(payload) }),
      startAttempt: (quizId: string) =>
        request<{ id: string; counts?: boolean; resumed?: boolean }>(`/api/quizzes/${quizId}/attempts`, { method: "POST" }),
      submitAttempt: (attemptId: string, answers: Record<string, Response>) =>
        request<{ id: string; status: string; score: number; maxScore: number }>(`/api/attempts/${attemptId}/submit`, {
          method: "POST",
          body: JSON.stringify({ answers }),
        }),
    },
    subjects: {
      remove: (subjectId: string) => request<{ ok: boolean }>(`/api/subjects/${subjectId}`, { method: "DELETE" }),
      fork: (subjectId: string) => request<{ id: string; name: string }>(`/api/subjects/${subjectId}/fork`, { method: "POST" }),
      createDeck: (subjectId: string, payload: CreateDeckPayload) =>
        request<{ id: string }>(`/api/subjects/${subjectId}/decks`, { method: "POST", body: JSON.stringify(payload) }),
      createQuiz: (subjectId: string, payload: CreateQuizPayload) =>
        request<{ id: string }>(`/api/subjects/${subjectId}/quizzes`, { method: "POST", body: JSON.stringify(payload) }),
    },
    profile: {
      syncTimezone: (timezone: string) =>
        request<{ ok: boolean } & StreakSummary>(`/api/profile/timezone`, {
          method: "POST",
          body: JSON.stringify({ timezone }),
        }),
    },
    rooms: {
      remove: (roomId: string) => request<{ ok: boolean }>(`/api/subjects/${roomId}`, { method: "DELETE" }),
      fork: (roomId: string) => request<{ id: string; name: string }>(`/api/subjects/${roomId}/fork`, { method: "POST" }),
    },
  };
}
