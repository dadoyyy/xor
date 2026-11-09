import { redirect } from "next/navigation";

export default async function DeepQuizResultsRedirect({
  params,
}: {
  params: Promise<{ id: string; quizId: string; attemptId: string }>;
}) {
  const { id, quizId, attemptId } = await params;
  redirect(`/subjects/${id}/quizzes/${quizId}/results/${attemptId}`);
}
