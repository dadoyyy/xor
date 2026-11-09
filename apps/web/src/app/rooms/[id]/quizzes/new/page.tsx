import { redirect } from "next/navigation";

export default async function NewQuizRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/subjects/${id}/quizzes/new`);
}
