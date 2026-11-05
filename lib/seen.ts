import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Section } from "@/lib/useRoomUpdates";

/**
 * When I last opened this section (or when I joined the room).
 * Used to tag items as "New". Returns null if tracking isn't installed.
 */
export async function getSeenAt(supabase: SupabaseClient, roomId: string, userId: string, section: Section) {
  const { data, error } = await supabase
    .from("room_seen")
    .select("seen_at")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .eq("section", section)
    .maybeSingle();
  if (error) return null; // migration 003 not run yet: no "New" tags
  if (data?.seen_at) return data.seen_at as string;
  const { data: m } = await supabase.from("room_members").select("joined_at").eq("room_id", roomId).eq("user_id", userId).maybeSingle();
  return (m?.joined_at as string) ?? null;
}

export const isNew = (createdAt: string | null | undefined, by: string | null | undefined, seenAt: string | null, me: string) =>
  !!seenAt && !!createdAt && by !== me && new Date(createdAt).getTime() > new Date(seenAt).getTime();
