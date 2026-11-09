import { requireRoom } from "@/services/authService";
import Leaderboard from "@/components/ui/Leaderboard";
import { ResetVote } from "@/features/leaderboard";
import MarkSeen from "@/components/ui/MarkSeen";

export const metadata = { title: "xor" };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default async function RoomLeaderboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isOwner, room } = await requireRoom(id);

  const [{ data: lb }, { data: poll }, { count: memberCount }] = await Promise.all([
    supabase.rpc("subject_leaderboard", { p_subject: id }),
    supabase
      .from("reset_polls")
      .select("id, status, created_at, expires_at, reset_votes(user_id, approve)")
      .eq("subject_id", id)
      .eq("status", "open")
      .maybeSingle(),
    supabase.from("library_entries").select("user_id", { count: "exact", head: true }).eq("subject_id", id),
  ]);

  type Row = { user_id: string; username: string; total_points: number; quizzes_taken: number; avg_percent: number | null; rank: number };
  const rows = ((lb ?? []) as Row[]).map((r) => ({
    userId: r.user_id,
    username: r.username,
    primary: `${fmt(Number(r.total_points))} pts`,
    secondary: `${r.quizzes_taken} quiz${Number(r.quizzes_taken) === 1 ? "" : "zes"}${r.avg_percent != null ? ` · avg ${Math.round(Number(r.avg_percent))}%` : ""}`,
    rank: Number(r.rank),
  }));
  const anyScores = rows.some((r) => r.primary !== "0 pts");

  const openPoll =
    poll && new Date(poll.expires_at).getTime() > Date.now()
      ? {
          id: poll.id as string,
          expiresAt: poll.expires_at as string,
          votes: (poll.reset_votes as { user_id: string; approve: boolean }[]) ?? [],
        }
      : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <MarkSeen roomId={id} section="leaderboard" />
      <section>
        <h2 className="text-2xl font-semibold">Subject leaderboard</h2>
        <p className="mb-2 mt-1 text-sm text-ink-soft">
          Points from everyone&apos;s first attempt at each quiz. Taking more quizzes and scoring higher both move you up.
          {room.leaderboard_epoch > 1 && ` Season ${room.leaderboard_epoch}.`}
        </p>
        <Leaderboard rows={anyScores ? rows : []} meId={user.id} empty="No scores yet. Take a quiz to get on the board!" />
      </section>
      <aside>
        <ResetVote roomId={id} meId={user.id} isOwner={isOwner} memberCount={memberCount ?? 1} poll={openPoll} />
      </aside>
    </div>
  );
}

