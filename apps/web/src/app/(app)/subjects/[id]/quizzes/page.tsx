import Link from "next/link";
import { requireRoom } from "@/services/authService";
import Mascot from "@/components/ui/Mascot";
import DeleteButton from "@/components/ui/DeleteButton";
import { qtypeLabel } from "@/utils/questions";
import { Plus, Timer } from "lucide-react";
import LinkSpinner from "@/components/ui/LinkSpinner";
import MarkSeen from "@/components/ui/MarkSeen";
import { NewTag } from "@/components/ui/Badges";
import { getSeenAt, isNew } from "@/services/seenService";

export const metadata = { title: "xor" };

const DIFF_TINT: Record<string, string> = { easy: "bg-lilac", medium: "border-sun bg-sun-tint", hard: "border-grape/40 bg-grape-tint text-grape", mixed: "bg-white" };

export default async function Quizzes({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isOwner, canEdit, room } = await requireRoom(id);

  // Parallelize seenAt, quizzes and attempts queries
  let [seenAt, { data: quizzes, error: qErr }, { data: mine, error: attErr }] = await Promise.all([
    getSeenAt(supabase, id, user.id, "quizzes"),
    supabase
      .from("quizzes")
      .select("id, title, question_types, difficulty, question_count, time_limit_minutes, max_score, created_by, created_at, profiles(username)")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("attempts")
      .select("quiz_id, score, max_score, counts, epoch, status")
      .eq("subject_id", id)
      .eq("user_id", user.id)
      .eq("status", "graded"),
  ]);

  if (qErr || attErr) {
    const [{ data: legacyQuizzes }, { data: legacyMine }] = await Promise.all([
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
    if (legacyQuizzes) quizzes = legacyQuizzes;
    if (legacyMine) mine = legacyMine;
  }

  const firstScore = new Map<string, { score: number; max: number }>();
  for (const a of mine ?? []) {
    if (a.counts && a.epoch === room.leaderboard_epoch) firstScore.set(a.quiz_id, { score: Number(a.score), max: Number(a.max_score) });
  }

  return (
    <div className="grid gap-6">
      <MarkSeen roomId={id} section="quizzes" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg sm:text-xl font-bold text-ink">Quizzes</h2>
        {canEdit && (
          <Link href={`/subjects/${id}/quizzes/new`} className="btn btn-primary btn-sm shadow-none">
            <Plus size={16} />
            <span>New quiz</span>
          </Link>
        )}
      </div>

      {!quizzes?.length ? (
        <div className="rounded-[20px] bg-[#F7F5FF] flex flex-col items-center px-6 py-12 text-center shadow-none select-none">
          <Mascot size={64} mood="think" />
          <p className="mt-3 font-display text-base font-bold text-ink">No quizzes yet</p>
          <p className="text-xs text-ink-soft mb-3">Make one, and everyone in this subject can take it.</p>
          {canEdit && (
            <Link href={`/subjects/${id}/quizzes/new`} className="btn btn-primary btn-sm shadow-none text-xs">
              Create first quiz
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {quizzes.map((q) => {
            const mineScore = firstScore.get(q.id);
            const author = (q.profiles as unknown as { username: string | null })?.username ?? "someone";
            return (
              <li
                key={q.id}
                className="rounded-[20px] bg-[#F7F5FF] p-5 flex flex-col justify-between sm:flex-row sm:items-center gap-3 shadow-none transition hover:bg-[#EFE9FF]/60 select-none"
              >
                <Link href={`/subjects/${id}/quizzes/${q.id}`} className="min-w-0 flex-1 group">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                      {q.difficulty}
                    </span>
                    <NewTag show={isNew(q.created_at, q.created_by, seenAt, user.id)} />
                    {q.time_limit_minutes && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                        <Timer size={11} /> {q.time_limit_minutes}m
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-base font-bold text-ink group-hover:text-[#5223BD] transition truncate mt-1.5">
                    {q.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {q.question_count} questions · by {author} · {(q.question_types as string[]).map(qtypeLabel).join(", ")}
                  </p>
                </Link>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5">
                  {mineScore ? (
                    <Link
                      href={`/subjects/${id}/quizzes/${q.id}`}
                      className="inline-flex items-center rounded-full bg-[#EFE9FF] px-3 py-1 text-xs font-bold text-[#5223BD]"
                    >
                      Score: {mineScore.score}/{mineScore.max}
                    </Link>
                  ) : (
                    <Link
                      href={`/subjects/${id}/quizzes/${q.id}`}
                      className="btn btn-primary btn-sm shadow-none text-xs"
                    >
                      Take quiz
                    </Link>
                  )}
                  {(q.created_by === user.id || isOwner) && (
                    <DeleteButton
                      table="quizzes"
                      id={q.id}
                      label={`Delete quiz ${q.title}`}
                      confirmText="Delete this quiz and its leaderboard?"
                    />
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

