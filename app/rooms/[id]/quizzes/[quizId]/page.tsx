import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRoom } from "@/lib/auth";
import Leaderboard from "@/components/Leaderboard";
import StartQuizButton from "./StartQuizButton";
import { qtypeLabel } from "@/lib/questions";
import { ChevronLeft, Timer } from "lucide-react";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default async function QuizPage({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params;
  const { supabase, user, room } = await requireRoom(id);

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, question_types, difficulty, question_count, time_limit_minutes, max_score, created_at, profiles(username)")
    .eq("id", quizId)
    .eq("room_id", id)
    .maybeSingle();
  if (!quiz) redirect(`/rooms/${id}/quizzes`);

  const [{ data: lb }, { data: attempts }] = await Promise.all([
    supabase.rpc("quiz_leaderboard", { p_quiz: quizId }),
    supabase
      .from("attempts")
      .select("id, status, score, max_score, counts, epoch, started_at, submitted_at")
      .eq("quiz_id", quizId)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false }),
  ]);

  const counted = (attempts ?? []).some((a) => a.counts && a.epoch === room.leaderboard_epoch);
  const inProgress = (attempts ?? []).find((a) => a.status === "in_progress");
  const author = (quiz.profiles as unknown as { username: string | null })?.username ?? "someone";

  type QRow = { user_id: string; username: string; score: number; max_score: number; rank: number };
  const rows = ((lb ?? []) as QRow[]).map((r) => ({
    userId: r.user_id,
    username: r.username,
    primary: `${fmt(Number(r.score))}/${fmt(Number(r.max_score))}`,
    secondary: `${Math.round((Number(r.score) / Math.max(1, Number(r.max_score))) * 100)}%`,
    rank: Number(r.rank),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="grid content-start gap-5">
        <Link href={`/rooms/${id}/quizzes`} className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-grape">
          <ChevronLeft size={16} /> All quizzes
        </Link>
        <div className="card p-5 sm:p-6">
          <h2 className="text-2xl font-semibold">{quiz.title}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            by {author} · {quiz.question_count} questions · {fmt(Number(quiz.max_score))} points
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip capitalize border-grape/30 bg-grape-tint text-grape">{quiz.difficulty}</span>
            {(quiz.question_types as string[]).map((t) => (
              <span key={t} className="chip">
                {qtypeLabel(t)}
              </span>
            ))}
            {quiz.time_limit_minutes ? (
              <span className="chip border-sun bg-sun-tint">
                <Timer size={14} /> {quiz.time_limit_minutes} min limit
              </span>
            ) : (
              <span className="chip">No time limit</span>
            )}
          </div>

          <div className="mt-5 rounded-2xl bg-sun-tint p-4 text-sm font-semibold">
            {inProgress
              ? "You have an unfinished attempt. Pick up where you left off."
              : counted
                ? "Your first score is already on the leaderboard. Retakes are practice: they're graded, but don't change your rank."
                : "Your first try counts on the leaderboard. After that, retake it as often as you like for practice."}
          </div>
          <StartQuizButton quizId={quizId} roomId={id} label={inProgress ? "Resume quiz" : counted ? "Practice again" : "Start quiz"} />
        </div>

        {!!attempts?.filter((a) => a.status === "graded").length && (
          <div className="card p-5">
            <h3 className="text-lg font-semibold">Your attempts</h3>
            <ul className="mt-3 grid gap-2">
              {attempts
                .filter((a) => a.status === "graded")
                .map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/rooms/${id}/quizzes/${quizId}/results/${a.id}`}
                      className="card-flat flex flex-wrap items-center justify-between gap-2 px-3 py-2 font-semibold hover:bg-lilac"
                    >
                      <span>
                        {new Date(a.submitted_at!).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        {a.counts && a.epoch === room.leaderboard_epoch && <span className="chip ml-2 border-sun bg-sun-tint">Ranked</span>}
                      </span>
                      <span className="font-display">
                        {fmt(Number(a.score))}/{fmt(Number(a.max_score))}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xl font-semibold">Quiz leaderboard</h3>
        <p className="mb-2 text-sm text-ink-soft">First attempts only.</p>
        <Leaderboard rows={rows} meId={user.id} empty="Nobody has taken this quiz yet. Be the first!" />
      </section>
    </div>
  );
}
