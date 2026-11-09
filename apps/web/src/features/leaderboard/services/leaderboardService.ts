import { createClient } from "@/lib/supabase/client";

export async function startResetPoll(roomId: string): Promise<{ data: unknown; error: { message: string } | null }> {
  const supabase = createClient();
  return supabase.rpc("start_reset_poll", { p_room: roomId });
}

export async function castResetVote(pollId: string, approve: boolean): Promise<{ data: unknown; error: { message: string } | null }> {
  const supabase = createClient();
  return supabase.rpc("cast_reset_vote", { p_poll: pollId, p_approve: approve });
}

export async function cancelResetPoll(pollId: string): Promise<{ data: unknown; error: { message: string } | null }> {
  const supabase = createClient();
  return supabase.rpc("cancel_reset_poll", { p_poll: pollId });
}

