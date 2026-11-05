import Link from "next/link";
import { requireRoom } from "@/lib/auth";
import Mascot from "@/components/Mascot";
import DeleteButton from "@/components/DeleteButton";
import { qtypeLabel } from "@/lib/questions";
import { Plus, Timer } from "lucide-react";

export const metadata = { title: "Quizzes" };

const DIFF_TINT: Record<string, string> = { easy: "bg-lilac", medium: "border-sun bg-sun-tint", hard: "border-grape/40 bg-grape-tint text-grape", mixed: "bg-white" };

export default async function Quizzes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isOwner, room } = await requireRoom(id);

  const [{ data: quizzes }, { data: mine }] = await Promise.all([
    supabase
      .from("quizzes")
      .select("id, title, question_types, difficulty, question_count, time_limit_minutes, max_score, created_by, created_at, profiles(username)")
      .eq("room_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("attempts")
      .select("quiz_id, score, max_score, counts, epoch, status")
      .eq("room_id", id)
      .eq("user_id", user.id)
      .eq("status", "graded"),
  ]);

  const firstScore = new Map<string, { score: number; max: number }>();
  for (const a of mine ?? []) {
    if (a.counts && a.epoch === room.leaderboard_epoch) firstScore.set(a.quiz_id, { score: Number(a.score), max: Number(a.max_score) });
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Quizzes</h2>
        <Link href={`/rooms/${id}/quizzes/new`} className="btn btn-sun">
          <Plus size={18} /> New quiz
        </Link>
      </div>

      {!quizzes?.length ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <Mascot size={80} mood="think" />
          <p className="mt-3 font-display text-lg font-semibold">No quizzes yet</p>
          <p className="text-sm text-ink-soft">Make one, and everyone in the room can take it.</p>
        </div>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {quizzes.map((q) => {
            const mineScore = firstScore.get(q.id);
            const author = (q.profiles as unknown as { username: string | null })?.username ?? "someone";
            return (
              <li key={q.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Link href={`/rooms/${id}/quizzes/${q.id}`} className="min-w-0 flex-1">
                  <p className="text-lg font-semibold leading-snug">{q.title}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {q.question_count} questions · by {author} · {(q.question_types as string[]).map(qtypeLabel).join(", ")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className={`chip capitalize ${DIFF_TINT[q.difficulty] ?? ""}`}>{q.difficulty}</span>
                    {q.time_limit_minutes && (
                      <span className="chip">
                        <Timer size={14} /> {q.time_limit_minutes} min
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  {mineScore ? (
                    <span className="chip border-grape/30 bg-grape-tint text-sm text-grape">
                      Your score: {mineScore.score}/{mineScore.max}
                    </span>
                  ) : (
                    <Link href={`/rooms/${id}/quizzes/${q.id}`} className="btn btn-primary btn-sm">
                      Take quiz
                    </Link>
                  )}
                  {(q.created_by === user.id || isOwner) && (
                    <DeleteButton table="quizzes" id={q.id} label={`Delete quiz ${q.title}`} confirmText="Delete this quiz and its leaderboard?" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
