import { redirect } from "next/navigation";

export default async function DeckRedirect({
  params,
}: {
  params: Promise<{ id: string; deckId: string }>;
}) {
  const { id, deckId } = await params;
  redirect(`/subjects/${id}/flashcards/${deckId}`);
}
