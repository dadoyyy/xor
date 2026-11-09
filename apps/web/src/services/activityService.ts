import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdmin } from "@/lib/supabase/server";
import { HttpError } from "@/services/authService";
import type { ActivityKind, StreakSummary } from "@/types/subject";

/**
 * Idempotently records a study action (`quiz_completed`, `cards_reviewed`, `material_added`)
 * per `(user_id, source_type, source_id)` in the user's local timezone (`profiles.timezone`)
 * and recomputes their streak when a new qualifying event is recorded.
 */
export async function recordStudyActivity(
  userId: string,
  kind: ActivityKind,
  count = 1,
  points = 0,
  sourceId?: string | null,
): Promise<StreakSummary & { recorded: boolean }> {
  const admin = createAdmin();
  const { data: recorded, error } = await admin.rpc("record_study_activity", {
    p_user: userId,
    p_kind: kind,
    p_count: count,
    p_points: points,
    p_source_id: sourceId ?? null,
  });
  if (error) throw error;

  const summary = await getStreakSummary(userId);
  return { ...summary, recorded: Boolean(recorded) };
}

/**
 * Validates that all `cardIds` belong to `deckId` and that the current user has access,
 * deduplicates reviewed cards per user per local day, and updates `activity_days` + streak.
 */
export async function recordDeckCardReviews(
  supabase: SupabaseClient,
  userId: string,
  deckId: string,
  cardIds: string[],
): Promise<StreakSummary & { cardsReviewed: number }> {
  const { data: newlyCounted, error } = await supabase.rpc("record_deck_card_reviews", {
    p_deck: deckId,
    p_card_ids: cardIds,
  });
  if (error) {
    throw new HttpError(400, error.message || "Could not record card review session.");
  }

  const summary = await getStreakSummary(userId);
  return {
    ...summary,
    cardsReviewed: Number(newlyCounted ?? 0),
  };
}

export const getStreakSummary = cache(async function getStreakSummary(userId: string): Promise<StreakSummary> {
  const admin = createAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("timezone, current_streak, longest_streak, last_active_date")
    .eq("id", userId)
    .maybeSingle();

  const { data: localDate } = await admin.rpc("user_local_date", {
    p_user: userId,
  });

  const lastActiveDate = (profile?.last_active_date as string | null) ?? null;
  const todayStr = typeof localDate === "string" ? localDate : null;

  return {
    timezone: (profile?.timezone as string) || "UTC",
    currentStreak: Number(profile?.current_streak ?? 0),
    longestStreak: Number(profile?.longest_streak ?? 0),
    lastActiveDate,
    todayQualified: Boolean(lastActiveDate && todayStr && lastActiveDate === todayStr),
  };
});

export type HeatmapDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3;
};

export async function getUserActivityHeatmap(userId: string, weeks = 12): Promise<HeatmapDay[]> {
  try {
    const admin = createAdmin();
    const since = new Date(Date.now() - weeks * 7 * 86400 * 1000).toISOString().slice(0, 10);
    const { data } = await admin
      .from("activity_days")
      .select("activity_date, quizzes_completed, cards_reviewed, materials_added")
      .eq("user_id", userId)
      .gte("activity_date", since);

    const map = new Map<string, number>();
    if (data) {
      for (const r of data) {
        const total =
          Number(r.quizzes_completed || 0) +
          Number(r.cards_reviewed || 0) +
          Number(r.materials_added || 0);
        map.set(r.activity_date, total);
      }
    }

    const result: HeatmapDay[] = [];
    const days = weeks * 7;
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const count = map.get(dateStr) ?? 0;
      const level: 0 | 1 | 2 | 3 = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;
      result.push({ date: dateStr, count, level });
    }
    return result;
  } catch {
    return [];
  }
}
