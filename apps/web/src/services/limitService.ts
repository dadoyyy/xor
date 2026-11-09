import "server-only";
import { createAdmin } from "@/lib/supabase/server";
import { HttpError } from "@/services/authService";

export type UsageKind = "process" | "generate" | "grade" | "fork" | "review" | "import";

const DEFAULTS: Record<UsageKind, number> = {
  process: 6,
  generate: 15,
  grade: 40,
  fork: 5,
  review: 60,
  import: 25,
};

const LABELS: Record<UsageKind, string> = {
  process: "PDF uploads",
  generate: "quiz and flashcard generations",
  grade: "quiz submissions",
  fork: "subject forks",
  review: "flashcard review logs",
  import: "text imports",
};

const DEFAULT_STORAGE_LIMIT_MB = 250;

function limitFor(kind: UsageKind) {
  const env = process.env[`DAILY_LIMIT_${kind.toUpperCase()}`];
  const n = env ? parseInt(env, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULTS[kind];
}

export function storageLimitBytes(): number {
  const env = process.env.USER_STORAGE_LIMIT_MB;
  const mb = env ? parseInt(env, 10) : NaN;
  const limitMb = Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_STORAGE_LIMIT_MB;
  return limitMb * 1024 * 1024;
}

/**
 * Keeps one person from using up the app's shared free quota.
 * Counts the last 24 hours, then records this use. Returns a function that
 * gives the use back (call it when an operation fails, so failures don't count).
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

/**
 * Enforces a per-user storage quota across all PDF materials uploaded or forked by the user.
 */
export async function checkUserStorageQuota(userId: string, additionalBytes: number): Promise<void> {
  if (additionalBytes <= 0) return;
  const admin = createAdmin();
  const { data, error } = await admin
    .from("materials")
    .select("file_size")
    .eq("uploaded_by", userId)
    .not("file_path", "is", null);
  if (error) throw error;

  const currentBytes = (data ?? []).reduce((sum, row) => sum + Number(row.file_size ?? 0), 0);
  const maxBytes = storageLimitBytes();
  if (currentBytes + additionalBytes > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new HttpError(
      413,
      `Forking this subject would exceed your ${maxMb} MB storage quota. Delete unused PDFs first.`,
    );
  }
}
