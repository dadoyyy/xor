import { redirect } from "next/navigation";
import { requireRoom } from "@/services/authService";
import { QuizTaker, type TakeQuestion } from "@/features/quizzes";

export const metadata = { title: "xor" };

export default async function Take({ params }: { params: Promise<{ id: string; quizId: string; attemptId: string }> }) {
  const { id, quizId, attemptId } = await params;
  const { supabase, user } = await requireRoom(id);

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, status, counts, started_at, quiz_id")
    .eq("id", attemptId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!attempt || attempt.quiz_id !== quizId) redirect(`/subjects/${id}/quizzes/${quizId}`);
  if (attempt.status !== "in_progress") redirect(`/subjects/${id}/quizzes/${quizId}/results/${attemptId}`);

  const [{ data: quiz }, { data: questions }] = await Promise.all([
    supabase.from("quizzes").select("title, time_limit_minutes").eq("id", quizId).single(),
    supabase.from("quiz_questions").select("id, position, qtype, prompt, choices, points").eq("quiz_id", quizId).order("position"),
  ]);

  return (
    <QuizTaker
      roomId={id}
      quizId={quizId}
      attemptId={attemptId}
      title={quiz?.title ?? "Quiz"}
      ranked={attempt.counts}
      startedAt={attempt.started_at}
      serverNow={new Date().toISOString()}
      timeLimitMinutes={quiz?.time_limit_minutes ?? null}
      questions={(questions ?? []) as TakeQuestion[]}
    />
  );
}

