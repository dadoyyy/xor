import Link from "next/link";
import { requireRoom } from "@/services/authService";
import Mascot from "@/components/ui/Mascot";
import DeleteButton from "@/components/ui/DeleteButton";
import { Plus } from "lucide-react";
import LinkSpinner from "@/components/ui/LinkSpinner";
import MarkSeen from "@/components/ui/MarkSeen";
import { NewTag } from "@/components/ui/Badges";
import { getSeenAt, isNew } from "@/services/seenService";

export const metadata = { title: "xor" };

const DIFF_TINT: Record<string, string> = { easy: "bg-lilac", medium: "border-sun bg-sun-tint", hard: "border-grape/40 bg-grape-tint text-grape", mixed: "bg-white" };

export default async function Flashcards({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isOwner, canEdit } = await requireRoom(id);

  // Parallelize seenAt and decks query
  const [seenAt, deckRes] = await Promise.all([
    getSeenAt(supabase, id, user.id, "flashcards"),
    supabase
      .from("decks")
      .select("id, title, difficulty, created_at, created_by, profiles(username), cards(count)")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
  ]);

  let decks = deckRes.data;
  if (deckRes.error) {
    const { data: legacyDecks } = await supabase
      .from("decks")
      .select("id, title, difficulty, created_at, created_by, profiles(username), cards(count)")
      .eq("room_id", id)
      .order("created_at", { ascending: false });
    if (legacyDecks) decks = legacyDecks;
  }

  return (
    <div className="grid gap-6">
      <MarkSeen roomId={id} section="flashcards" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg sm:text-xl font-bold text-ink">Flashcard decks</h2>
        {canEdit && (
          <Link href={`/subjects/${id}/flashcards/new`} className="btn btn-primary btn-sm shadow-none">
            <Plus size={16} />
            <span>New deck</span>
          </Link>
        )}
      </div>

      {!decks?.length ? (
        <div className="rounded-[20px] bg-[#F7F5FF] flex flex-col items-center px-6 py-12 text-center shadow-none select-none">
          <Mascot size={64} mood="think" />
          <p className="mt-3 font-display text-base font-bold text-ink">No decks yet</p>
          <p className="text-xs text-ink-soft mb-3">Make one from your uploaded materials in a few seconds.</p>
          {canEdit && (
            <Link href={`/subjects/${id}/flashcards/new`} className="btn btn-primary btn-sm shadow-none text-xs">
              Create first deck
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {decks.map((d) => {
            const count = (d.cards as unknown as { count: number }[])?.[0]?.count ?? 0;
            const author = (d.profiles as unknown as { username: string | null })?.username ?? "someone";
            return (
              <li
                key={d.id}
                className="rounded-[20px] bg-[#F7F5FF] p-5 flex flex-col justify-between shadow-none transition hover:bg-[#EFE9FF]/60 select-none"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                      {d.difficulty}
                    </span>
                    <NewTag show={isNew(d.created_at, d.created_by, seenAt, user.id)} />
                  </div>
                  <Link href={`/subjects/${id}/flashcards/${d.id}`} className="block group mt-2">
                    <h3 className="font-display text-base font-bold text-ink group-hover:text-[#5223BD] transition truncate">
                      {d.title}
                    </h3>
                    <p className="mt-1 text-xs text-ink-soft">
                      {count} {count === 1 ? "card" : "cards"} · by {author}
                    </p>
                  </Link>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
                  <Link
                    href={`/subjects/${id}/flashcards/${d.id}`}
                    className="btn btn-primary btn-sm shadow-none text-xs"
                  >
                    Study deck
                  </Link>
                  {(d.created_by === user.id || isOwner) && (
                    <DeleteButton
                      table="decks"
                      id={d.id}
                      label={`Delete deck ${d.title}`}
                      confirmText="Delete this deck?"
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

