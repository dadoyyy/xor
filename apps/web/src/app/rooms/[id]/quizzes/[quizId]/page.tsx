import { redirect } from "next/navigation";

export default async function DeepQuizRedirect({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id, quizId } = await params;
  redirect(`/subjects/${id}/quizzes/${quizId}`);
}
