import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRoom } from "@/lib/auth";
import { createAdmin } from "@/lib/supabase/server";
import Mascot from "@/components/Mascot";
import { qtypeLabel, type AnswerKey } from "@/lib/questions";
import { CheckCircle2, ChevronLeft, CircleDashed, XCircle } from "lucide-react";

export const metadata = { title: "Results" };

const LETTERS = "ABCDEFGHIJ";
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

type Choices = { options?: string[]; left?: string[]; right?: string[] } | null;
type Resp = Record<string, unknown> | null;

function showResponse(qtype: string, choices: Choices, r: Resp): string {
  if (!r) return "(no answer)";
  switch (qtype) {
    case "multiple_choice":
      return typeof r.index === "number" ? `${LETTERS[r.index]}. ${choices?.options?.[r.index] ?? ""}` : "(no answer)";
    case "true_false":
      return typeof r.value === "boolean" ? (r.value ? "True" : "False") : "(no answer)";
    case "enumeration":
      return Array.isArray(r.items) && r.items.some((s) => String(s).trim())
        ? (r.items as string[]).filter((s) => s.trim()).join(", ")
        : "(no answer)";
    case "matching":
      return Array.isArray(r.pairs)
        ? (choices?.left ?? []).map((l, i) => `${l} → ${r.pairs && (r.pairs as (number | null)[])[i] != null ? LETTERS[(r.pairs as number[])[i]] : "?"}`).join("; ")
        : "(no answer)";
    default:
      return typeof r.text === "string" && r.text.trim() ? r.text : "(no answer)";
  }
}

function showKey(qtype: string, choices: Choices, k: AnswerKey): string {
  if ("index" in k) return `${LETTERS[k.index]}. ${choices?.options?.[k.index] ?? ""}`;
  if ("value" in k) return k.value ? "True" : "False";
  if ("accepted" in k) return k.text;
  if ("items" in k) return k.items.join(", ");
  if ("pairs" in k) return (choices?.left ?? []).map((l, i) => `${l} → ${LETTERS[k.pairs[i]]}`).join("; ");
  if ("model_answer" in k) return k.model_answer;
  return "";
}

export default async function Results({ params }: { params: Promise<{ id: string; quizId: string; attemptId: string }> }) {
  const { id, quizId, attemptId } = await params;
  const { supabase, user, room } = await requireRoom(id);

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, status, score, max_score, counts, epoch, quiz_id, submitted_at")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attempt || attempt.quiz_id !== quizId) redirect(`/rooms/${id}/quizzes/${quizId}`);
  if (attempt.status === "in_progress") redirect(`/rooms/${id}/quizzes/${quizId}/take/${attemptId}`);

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
      <Link href={`/rooms/${id}/quizzes/${quizId}`} className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-grape">
        <ChevronLeft size={16} /> Back to quiz
      </Link>

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] 2xl:grid-cols-[24rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="card relative overflow-hidden p-6 text-center">
        <Mascot size={88} mood={pct >= 75 ? "party" : pct >= 40 ? "happy" : "think"} className="pop mx-auto" />
        <p className="mt-2 font-semibold text-ink-soft">{quiz?.title}</p>
        <p className="font-display text-5xl font-bold">
          {fmt(score)}
          <span className="text-2xl text-ink-soft">/{fmt(max)}</span>
        </p>
        <p className="mt-1 font-display text-xl font-semibold">
          {pct}% · {pct >= 90 ? "Outstanding!" : pct >= 75 ? "Great job!" : pct >= 50 ? "Nice work, keep going!" : "Good start. Review and try again!"}
        </p>
        <span className={`chip mt-3 ${ranked ? "border-sun bg-sun-tint" : ""}`}>{ranked ? "Counted on the leaderboard" : "Practice run (not ranked)"}</span>
        {attempt.status === "grading" && <p className="mt-3 text-sm font-semibold text-ink-soft">Still grading. Refresh in a moment.</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href={`/rooms/${id}/quizzes/${quizId}`} className="btn btn-primary">
            See leaderboard
          </Link>
        </div>
      </div>
      </aside>

      <section className="min-w-0">
      <h2 className="mb-3 text-xl font-semibold">Review</h2>
      <ol className="grid gap-4 2xl:grid-cols-2">
        {(questions ?? []).map((q, k) => {
          const a = byQ.get(q.id);
          const keyRow = (Array.isArray(q.quiz_answer_keys) ? q.quiz_answer_keys[0] : q.quiz_answer_keys) as
            | { answer: AnswerKey; explanation: string | null }
            | undefined;
          const pts = Number(a?.points ?? 0);
          const maxPts = Number(q.points);
          const state = pts >= maxPts ? "right" : pts > 0 ? "partial" : "wrong";
          const tint = state === "right" ? "bg-mint-tint" : state === "partial" ? "bg-sun-tint" : "bg-coral-tint";
          const Icon = state === "right" ? CheckCircle2 : state === "partial" ? CircleDashed : XCircle;
          const open = q.qtype === "essay" || q.qtype === "scenario";
          return (
            <li key={q.id} className="card overflow-hidden">
              <div className={`flex items-center justify-between gap-2 border-b-2 border-line px-4 py-2 ${tint}`}>
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Icon size={18} /> Question {k + 1} · {qtypeLabel(q.qtype)}
                </span>
                <span className="font-display font-semibold">
                  {fmt(pts)}/{fmt(maxPts)}
                </span>
              </div>
              <div className="grid gap-3 p-4">
                <p className="whitespace-pre-line font-semibold">{q.prompt}</p>
                <div className="text-sm">
                  <p className="font-bold text-ink-soft">Your answer</p>
                  <p className="whitespace-pre-line">{showResponse(q.qtype, q.choices as Choices, (a?.response as Resp) ?? null)}</p>
                </div>
                {keyRow && (
                  <div className="text-sm">
                    <p className="font-bold text-ink-soft">{open ? "Model answer" : "Correct answer"}</p>
                    <p className="whitespace-pre-line">{showKey(q.qtype, q.choices as Choices, keyRow.answer)}</p>
                  </div>
                )}
                {(a?.feedback || keyRow?.explanation) && (
                  <p className="rounded-2xl bg-grape-tint px-3 py-2 text-sm">
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
