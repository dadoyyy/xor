import {
  formatScore,
  ResultSound,
  showKey,
  showResponse,
  type Choices,
  type Resp,
} from "@/features/quizzes";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRoom } from "@/services/authService";
import { createAdmin } from "@/lib/supabase/server";
import Mascot from "@/components/ui/Mascot";
import { qtypeLabel, type AnswerKey } from "@/utils/questions";
import { CheckCircle2, ChevronLeft, CircleDashed, XCircle } from "lucide-react";

export const metadata = { title: "xor" };

export default async function Results({ params }: { params: Promise<{ id: string; quizId: string; attemptId: string }> }) {
  const { id, quizId, attemptId } = await params;
  const { supabase, user, room } = await requireRoom(id);

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, status, score, max_score, counts, epoch, quiz_id, submitted_at")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attempt || attempt.quiz_id !== quizId) redirect(`/subjects/${id}/quizzes/${quizId}`);
  if (attempt.status === "in_progress") redirect(`/subjects/${id}/quizzes/${quizId}/take/${attemptId}`);

  // Answer keys are only revealed to someone who has finished this quiz (server-side read).
  const admin = createAdmin();
  const [{ data: quiz }, { data: questions }, { data: answers }] = await Promise.all([
    supabase.from("quizzes").select("title").eq("id", quizId).single(),
    admin
      .from("quiz_questions")
      .select("id, position, qtype, prompt, choices, points, quiz_answer_keys(answer, explanation)")
      .eq("quiz_id", quizId)
      .order("position"),
    supabase.from("attempt_answers").select("question_id, response, is_correct, points, feedback").eq("attempt_id", attemptId),
  ]);
  const byQ = new Map((answers ?? []).map((a) => [a.question_id, a]));

  const score = Number(attempt.score ?? 0);
  const max = Number(attempt.max_score ?? 0);
  const pct = max ? Math.round((score / max) * 100) : 0;
  const ranked = attempt.counts && attempt.epoch === room.leaderboard_epoch;

  return (
    <div className="grid gap-5">
      <Link href={`/subjects/${id}/quizzes/${quizId}`} className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-grape">
        <ChevronLeft size={16} /> Back to quiz
      </Link>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[24rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
      {attempt.status === "graded" && <ResultSound attemptId={attempt.id} pct={pct} submittedAt={attempt.submitted_at} />}
      <div className="rounded-[20px] bg-[#F7F5FF] relative overflow-hidden p-6 text-center shadow-none select-none">
        <Mascot size={80} mood={pct >= 75 ? "party" : pct >= 40 ? "happy" : "think"} className="pop mx-auto" />
        <p className="mt-2 text-xs font-semibold text-ink-soft">{quiz?.title}</p>
        <p className="font-display text-5xl font-extrabold text-ink my-1">
          {formatScore(score)}
          <span className="text-2xl text-ink-soft">/{formatScore(max)}</span>
        </p>
        <p className="font-display text-lg font-bold text-ink">
          {pct}% · {pct >= 90 ? "Outstanding!" : pct >= 75 ? "Great job!" : pct >= 50 ? "Nice work, keep going!" : "Good start. Review and try again!"}
        </p>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold mt-2 ${ranked ? "bg-[#FFF1C2] text-ink" : "bg-white text-ink-soft"}`}>
          {ranked ? "Counted on the leaderboard" : "Practice run (not ranked)"}
        </span>
        {attempt.status === "grading" && <p className="mt-3 text-xs font-semibold text-ink-soft">Still grading. Refresh in a moment.</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href={`/subjects/${id}/quizzes/${quizId}`} className="btn btn-primary btn-sm shadow-none text-xs">
            See leaderboard
          </Link>
        </div>
      </div>
      </aside>

      <section className="min-w-0">
      <h2 className="mb-3 font-display text-lg font-bold text-ink">Question Review</h2>
      <ol className="grid gap-4">
        {(questions ?? []).map((q, k) => {
          const a = byQ.get(q.id);
          const keyRow = (Array.isArray(q.quiz_answer_keys) ? q.quiz_answer_keys[0] : q.quiz_answer_keys) as
            | { answer: AnswerKey; explanation: string | null }
            | undefined;
          const pts = Number(a?.points ?? 0);
          const maxPts = Number(q.points);
          const state = pts >= maxPts ? "right" : pts > 0 ? "partial" : "wrong";
          const tint = state === "right" ? "bg-mint/15 text-mint" : state === "partial" ? "bg-sun/20 text-ink" : "bg-coral/15 text-coral";
          const Icon = state === "right" ? CheckCircle2 : state === "partial" ? CircleDashed : XCircle;
          const open = q.qtype === "essay" || q.qtype === "scenario";
          return (
            <li key={q.id} className="rounded-[20px] bg-[#F7F5FF] overflow-hidden shadow-none">
              <div className={`flex items-center justify-between gap-2 px-4 py-2.5 ${tint}`}>
                <span className="flex items-center gap-2 text-xs font-bold">
                  <Icon size={16} /> Question {k + 1} · {qtypeLabel(q.qtype)}
                </span>
                <span className="font-display text-xs font-bold">
                  {formatScore(pts)}/{formatScore(maxPts)} pts
                </span>
              </div>
              <div className="grid gap-3 p-4">
                <p className="whitespace-pre-line font-display text-sm font-bold text-ink">{q.prompt}</p>
                <div className="text-xs">
                  <p className="font-bold text-ink-soft">Your answer:</p>
                  <p className="whitespace-pre-line text-ink mt-0.5">{showResponse(q.qtype, q.choices as Choices, (a?.response as Resp) ?? null)}</p>
                </div>
                {keyRow && (
                  <div className="text-xs">
                    <p className="font-bold text-ink-soft">{open ? "Model answer:" : "Correct answer:"}</p>
                    <p className="whitespace-pre-line text-ink mt-0.5">{showKey(q.qtype, q.choices as Choices, keyRow.answer)}</p>
                  </div>
                )}
                {(a?.feedback || keyRow?.explanation) && (
                  <p className="rounded-[12px] bg-white p-2.5 text-xs text-ink-soft">
                    {a?.feedback || keyRow?.explanation}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      </section>
      </div>
    </div>
  );
}

