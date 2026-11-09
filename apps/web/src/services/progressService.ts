import "server-only";
import { createAdmin } from "@/lib/supabase/server";
import { evaluateBadges, type BadgeDefinition } from "@/features/progress/lib/badges";
import { buildHeatmapCells, type HeatmapCell } from "@/features/progress/lib/heatmap";

export { buildHeatmapCells, type HeatmapCell };

export type RecentAttemptItem = {
  id: string;
  quizId: string;
  quizTitle: string;
  subjectId: string;
  subjectName: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  status: string;
  submittedAt: string | null;
  startedAt: string;
};

export type ProgressData = {
  timezone: string;
  currentStreak: number;
  longestStreak: number;
  thisWeekActiveDays: number;
  totalQuizzesCompleted: number;
  totalCardsReviewed: number;
  totalMaterialsAdded: number;
  monthlyHeatmap: HeatmapCell[];
  yearlyHeatmap: HeatmapCell[];
  badges: BadgeDefinition[];
  recentAttempts: RecentAttemptItem[];
  hasAnyData: boolean;
};

/**
 * Loads all progress data server-side for the specified user.
 */
export async function getUserProgressData(userId: string): Promise<ProgressData> {
  const admin = createAdmin();

  // 1. Profile & user local date
  const [{ data: profile }, { data: localDateRes }] = await Promise.all([
    admin
      .from("profiles")
      .select("timezone, current_streak, longest_streak, last_active_date")
      .eq("id", userId)
      .maybeSingle(),
    admin.rpc("user_local_date", { p_user: userId }),
  ]);

  const timezone = (profile?.timezone as string) || "UTC";
  const currentStreak = Number(profile?.current_streak ?? 0);
  const longestStreak = Number(profile?.longest_streak ?? 0);
  const todayStr =
    typeof localDateRes === "string"
      ? localDateRes
      : new Date().toISOString().slice(0, 10);

  // 2. Activity days (all historical rows for user)
  const { data: actRows } = await admin
    .from("activity_days")
    .select("activity_date, quizzes_completed, cards_reviewed, materials_added, points_earned, qualifies_for_streak")
    .eq("user_id", userId)
    .order("activity_date", { ascending: true });

  const activityRows = actRows ?? [];

  // Totals
  let totalQuizzesCompleted = 0;
  let totalCardsReviewed = 0;
  let totalMaterialsAdded = 0;

  for (const r of activityRows) {
    totalQuizzesCompleted += Number(r.quizzes_completed || 0);
    totalCardsReviewed += Number(r.cards_reviewed || 0);
    totalMaterialsAdded += Number(r.materials_added || 0);
  }

  // Active days this week (last 7 days up to today)
  const sevenDaysAgo = new Date(new Date(`${todayStr}T00:00:00Z`).getTime() - 6 * 86400 * 1000)
    .toISOString()
    .slice(0, 10);
  const thisWeekActiveDays = activityRows.filter(
    (r) => r.activity_date >= sevenDaysAgo && r.activity_date <= todayStr && (r.quizzes_completed > 0 || r.cards_reviewed > 0 || r.materials_added > 0),
  ).length;

  // Monthly heatmap: last 30 days
  const monthlyHeatmap = buildHeatmapCells(activityRows, 30, todayStr);

  // Yearly heatmap: 52 weeks = 364 days
  const yearlyHeatmap = buildHeatmapCells(activityRows, 364, todayStr);

  // 3. User attempts (last 10 attempts + all attempts count for badges)
  const { data: attData } = await admin
    .from("attempts")
    .select("id, score, max_score, status, submitted_at, started_at, quizzes(id, title, subject_id, subjects(id, name))")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(50);

  const rawAttempts = attData ?? [];

  const recentAttempts: RecentAttemptItem[] = rawAttempts.slice(0, 10).map((a: any) => {
    const q = a.quizzes;
    const s = q?.subjects;
    const scoreNum = a.score != null ? Number(a.score) : null;
    const maxNum = a.max_score != null ? Number(a.max_score) : null;
    const percentage =
      scoreNum != null && maxNum != null && maxNum > 0
        ? Math.round((scoreNum / maxNum) * 100)
        : null;

    return {
      id: a.id,
      quizId: q?.id || "",
      quizTitle: q?.title || "Quiz",
      subjectId: q?.subject_id || "",
      subjectName: s?.name || "Subject",
      score: scoreNum,
      maxScore: maxNum,
      percentage,
      status: a.status,
      submittedAt: a.submitted_at,
      startedAt: a.started_at,
    };
  });

  // 4. Memberships for badge computation
  const { data: memRows } = await admin
    .from("library_entries")
    .select("role, added_at")
    .eq("user_id", userId);

  const memberships = (memRows ?? []).map((m) => ({
    role: m.role,
    added_at: m.added_at,
  }));

  // 5. Evaluate Badges
  const badges = evaluateBadges({
    longestStreak,
    currentStreak,
    attempts: rawAttempts.map((a) => ({
      id: a.id,
      score: a.score != null ? Number(a.score) : null,
      max_score: a.max_score != null ? Number(a.max_score) : null,
      status: a.status,
      submitted_at: a.submitted_at,
      started_at: a.started_at,
    })),
    memberships,
    totalQuizzesCompleted,
  });

  const hasAnyData =
    activityRows.length > 0 ||
    recentAttempts.length > 0 ||
    memberships.length > 0 ||
    currentStreak > 0 ||
    longestStreak > 0;

  return {
    timezone,
    currentStreak,
    longestStreak,
    thisWeekActiveDays,
    totalQuizzesCompleted,
    totalCardsReviewed,
    totalMaterialsAdded,
    monthlyHeatmap,
    yearlyHeatmap,
    badges,
    recentAttempts,
    hasAnyData,
  };
}
