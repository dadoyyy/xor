import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRoom } from "@/services/authService";
import { StudyDeck } from "@/features/flashcards";
import { ChevronLeft } from "lucide-react";

export default async function Deck({ params }: { params: Promise<{ id: string; deckId: string }> }) {
  const { id, deckId } = await params;
  const { supabase } = await requireRoom(id);
  const { data: deck } = await supabase
    .from("decks")
    .select("id, title, difficulty, cards(id, position, front, back)")
    .eq("id", deckId)
    .eq("subject_id", id)
    .maybeSingle();
  if (!deck) redirect(`/subjects/${id}/flashcards`);

  const cards = [...((deck.cards as { id: string; position: number; front: string; back: string }[]) ?? [])].sort(
    (a, b) => a.position - b.position,
  );

  return (
    <div>
      <Link href={`/subjects/${id}/flashcards`} className="inline-flex items-center gap-1 text-sm font-bold text-ink-soft hover:text-grape">
        <ChevronLeft size={16} /> All decks
      </Link>
      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{deck.title}</h2>
      <StudyDeck cards={cards} deckId={deck.id} />
    </div>
  );
}

