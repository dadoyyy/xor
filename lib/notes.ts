import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/auth";

// ~120k tokens. Keeps requests within free-tier per-minute token limits.
const MAX_CHARS = 480_000;

/** Loads AI notes for the chosen materials (user client → RLS ensures membership). */
export async function loadNotes(supabase: SupabaseClient, roomId: string, materialIds: string[]) {
  if (!materialIds.length) throw new HttpError(400, "Pick at least one study material.");
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, content, status")
    .eq("room_id", roomId)
    .in("id", materialIds);
  if (error) throw error;
  const ready = (data ?? []).filter((m) => m.status === "ready" && m.content);
  if (!ready.length) throw new HttpError(400, "Those materials aren't ready yet.");

  const perDoc = Math.floor(MAX_CHARS / ready.length);
  const notes = ready
    .map((m) => `# Material: ${m.title}\n\n${(m.content as string).slice(0, perDoc)}`)
    .join("\n\n---\n\n");
  return { notes, materialIds: ready.map((m) => m.id) };
}
