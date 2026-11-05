import "server-only";
import { createAdmin } from "@/lib/supabase/server";
import { HttpError } from "@/lib/auth";

export type UsageKind = "process" | "generate" | "grade";

const DEFAULTS: Record<UsageKind, number> = { process: 6, generate: 15, grade: 40 };
const LABELS: Record<UsageKind, string> = {
  process: "PDF uploads",
  generate: "quiz and flashcard generations",
  grade: "quiz submissions",
};

function limitFor(kind: UsageKind) {
  const env = process.env[`DAILY_LIMIT_${kind.toUpperCase()}`];
  const n = env ? parseInt(env, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULTS[kind];
}

/**
 * Keeps one person from using up the app's shared free AI quota.
 * Counts the last 24 hours, then records this use. Returns a function that
 * gives the use back (call it when the AI fails, so failures don't count).
 */
export async function useQuota(userId: string, kind: UsageKind): Promise<() => Promise<void>> {
  const admin = createAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", since);
  const limit = limitFor(kind);
  if ((count ?? 0) >= limit) {
    throw new HttpError(429, `You've reached today's limit of ${limit} ${LABELS[kind]}. It resets within 24 hours.`);
  }
  const { data } = await admin.from("usage_events").insert({ user_id: userId, kind }).select("id").single();
  return async () => {
    if (data?.id) await admin.from("usage_events").delete().eq("id", data.id);
  };
}
