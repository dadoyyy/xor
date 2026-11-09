import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Section } from "@/types/room";

/**
 * When I last opened this section (or when I joined the room).
 * Used to tag items as "New". Returns null if tracking isn't installed.
 */
export async function getSeenAt(supabase: SupabaseClient, roomId: string, userId: string, section: Section) {
  const sec = section === "members" ? "sharing" : section;
  const { data, error } = await supabase
    .from("subject_seen")
    .select("seen_at")
    .eq("subject_id", roomId)
    .eq("user_id", userId)
    .eq("section", sec)
    .maybeSingle();
  if (error) return null; // tracking not installed: no "New" tags
  if (data?.seen_at) return data.seen_at as string;
  const { data: m } = await supabase
    .from("library_entries")
    .select("added_at")
    .eq("subject_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return (m?.added_at as string) ?? null;
}

export const isNew = (createdAt: string | null | undefined, by: string | null | undefined, seenAt: string | null, me: string) =>
  !!seenAt && !!createdAt && by !== me && new Date(createdAt).getTime() > new Date(seenAt).getTime();

