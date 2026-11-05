import { apiMember, errorResponse, HttpError } from "@/lib/auth";
import { createAdmin, createClient } from "@/lib/supabase/server";

// Start (or resume) an attempt. Only the first attempt of a leaderboard
// season "counts"; later attempts are practice runs.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: quizId } = await params;
    const supabase = await createClient();
    const { data: quiz } = await supabase.from("quizzes").select("id, room_id").eq("id", quizId).maybeSingle();
    if (!quiz) throw new HttpError(404, "Quiz not found.");
    const { user, room } = await apiMember(quiz.room_id);

    const admin = createAdmin();

    const { data: open } = await admin
      .from("attempts")
      .select("id")
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open) return Response.json({ id: open.id, resumed: true });

    const { count } = await admin
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .eq("epoch", room.leaderboard_epoch)
      .eq("counts", true);

    const base = { quiz_id: quizId, room_id: quiz.room_id, user_id: user.id, epoch: room.leaderboard_epoch };
    let res = await admin.from("attempts").insert({ ...base, counts: !count }).select("id, counts").single();
    if (res.error?.code === "23505") {
      // lost a race with another tab: this one is practice
      res = await admin.from("attempts").insert({ ...base, counts: false }).select("id, counts").single();
    }
    if (res.error) throw res.error;
    return Response.json({ id: res.data.id, counts: res.data.counts });
  } catch (e) {
    return errorResponse(e);
  }
}
