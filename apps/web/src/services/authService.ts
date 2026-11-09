import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, createAdmin } from "@/lib/supabase/server";
import type { LibraryEntry, SubjectRole, SubjectSummary } from "@/types/subject";

export type AuthenticatedProfile = {
  id: string;
  username: string;
  timezone: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

/** For pages: signed-in user with a username, or redirect. */
export const requireProfile = cache(async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Query canonical 005 schema columns directly. Fails loudly if schema is unmigrated.
  const { data: profileData, error } = await supabase
    .from("profiles")
    .select("id, username, timezone, current_streak, longest_streak, last_active_date")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`[FATAL] Failed to load profile: ${error.message} (code ${error.code})`);
  }

  if (!profileData?.username) redirect("/onboarding");

  return {
    supabase,
    user,
    profile: {
      id: profileData.id as string,
      username: profileData.username as string,
      timezone: (profileData.timezone as string) || "UTC",
      current_streak: Number(profileData.current_streak ?? 0),
      longest_streak: Number(profileData.longest_streak ?? 0),
      last_active_date: (profileData.last_active_date as string | null) ?? null,
    } satisfies AuthenticatedProfile,
  };
});

/** For pages inside a subject: library membership + subject row + role permissions, or redirect. */
export const requireSubject = cache(async function requireSubject(subjectId: string) {
  const ctx = await requireProfile();
  const [{ data: subject, error: subErr }, { data: entry, error: entErr }] = await Promise.all([
    ctx.supabase
      .from("subjects")
      .select(
        "id, name, description, owner_id, share_enabled, allow_fork, forked_from_id, forked_from_name, forked_from_owner_id, leaderboard_epoch, cover, created_at, updated_at",
      )
      .eq("id", subjectId)
      .maybeSingle(),
    ctx.supabase
      .from("library_entries")
      .select("subject_id, user_id, role, pinned, cover, added_at, last_opened_at")
      .eq("subject_id", subjectId)
      .eq("user_id", ctx.user.id)
      .maybeSingle(),
  ]);

  if (subErr) {
    throw new Error(`[FATAL] Failed to load subject: ${subErr.message} (code ${subErr.code})`);
  }
  if (entErr) {
    throw new Error(`[FATAL] Failed to load library entry: ${entErr.message} (code ${entErr.code})`);
  }

  if (!subject) redirect("/subjects?missing=1");

  const typedSubject = subject as SubjectSummary;
  const typedEntry = (entry as LibraryEntry | null) ?? null;
  const isOwner = typedSubject.owner_id === ctx.user.id || typedEntry?.role === "owner";
  const role: SubjectRole = isOwner ? "owner" : ((typedEntry?.role as SubjectRole | undefined) ?? "viewer");
  const canEdit = role === "owner" || role === "editor";
  const isViewer = role === "viewer";

  return {
    ...ctx,
    subject: typedSubject,
    room: typedSubject,
    libraryEntry: typedEntry,
    role,
    isOwner,
    canEdit,
    isViewer,
  };
});

/** Backwards-compatible alias for `requireSubject`. */
export async function requireRoom(roomId: string) {
  return requireSubject(roomId);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type ApiSubjectMemberOptions = {
  requireEdit?: boolean;
  requireOwner?: boolean;
};

/** For API routes: returns user + subject + role permissions, or throws HttpError. */
export async function apiSubjectMember(subjectId: string, options?: ApiSubjectMemberOptions) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new HttpError(401, "Sign in first.");

  const [{ data: subject, error: subErr }, { data: entry, error: entErr }] = await Promise.all([
    supabase
      .from("subjects")
      .select(
        "id, name, description, owner_id, share_enabled, allow_fork, forked_from_id, forked_from_name, forked_from_owner_id, leaderboard_epoch, cover, created_at, updated_at",
      )
      .eq("id", subjectId)
      .maybeSingle(),
    supabase
      .from("library_entries")
      .select("role")
      .eq("subject_id", subjectId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (subErr) {
    throw new HttpError(500, `Database error loading subject: ${subErr.message}`);
  }
  if (entErr) {
    throw new HttpError(500, `Database error loading membership: ${entErr.message}`);
  }

  if (!subject) throw new HttpError(403, "You don't have access to this subject.");

  const typedSubject = subject as SubjectSummary;
  const isOwner = typedSubject.owner_id === user.id || entry?.role === "owner";
  const role: SubjectRole = isOwner ? "owner" : ((entry?.role as SubjectRole | undefined) ?? "viewer");
  const canEdit = role === "owner" || role === "editor";
  const isViewer = role === "viewer";

  if (options?.requireOwner && !isOwner) {
    throw new HttpError(403, "Only the subject owner can do this.");
  }
  if (options?.requireEdit && !canEdit) {
    throw new HttpError(
      403,
      "You have view-only access to this subject. Fork it to your library or ask the owner for editor access.",
    );
  }

  return {
    supabase,
    user,
    subject: typedSubject,
    room: typedSubject,
    role,
    isOwner,
    canEdit,
    isViewer,
  };
}

/** Backwards-compatible alias for `apiSubjectMember`. */
export async function apiMember(roomId: string, options?: ApiSubjectMemberOptions) {
  return apiSubjectMember(roomId, options);
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof Error && e.name === "AIError") return Response.json({ error: e.message }, { status: 503 });
  console.error(e);
  const msg = e instanceof Error ? e.message : "Something went wrong.";
  return Response.json({ error: msg }, { status: 500 });
}
