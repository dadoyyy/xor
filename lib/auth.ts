import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** For pages: signed-in user with a username, or redirect. */
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id, username").eq("id", user.id).single();
  if (!profile?.username) redirect("/onboarding");
  return { supabase, user, profile: profile as { id: string; username: string } };
}

/** For pages inside a room: membership + room row, or 404-style redirect. */
export async function requireRoom(roomId: string) {
  const ctx = await requireProfile();
  const { data: room } = await ctx.supabase
    .from("rooms")
    .select("id, name, description, owner_id, leaderboard_epoch, created_at")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) redirect("/rooms?missing=1");
  return { ...ctx, room, isOwner: room.owner_id === ctx.user.id };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** For API routes: returns user + membership, or throws HttpError. */
export async function apiMember(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new HttpError(401, "Sign in first.");
  const { data: room } = await supabase
    .from("rooms")
    .select("id, owner_id, leaderboard_epoch")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) throw new HttpError(403, "You're not a member of this room.");
  return { supabase, user, room, isOwner: room.owner_id === user.id };
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof Error && e.name === "AIError") return Response.json({ error: e.message }, { status: 503 });
  console.error(e);
  const msg = e instanceof Error ? e.message : "Something went wrong.";
  return Response.json({ error: msg }, { status: 500 });
}
