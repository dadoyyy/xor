import Link from "next/link";
import { requireRoom } from "@/lib/auth";
import Mascot from "@/components/Mascot";
import DeleteButton from "@/components/DeleteButton";
import { Plus } from "lucide-react";
import LinkSpinner from "@/components/LinkSpinner";
import MarkSeen from "@/components/MarkSeen";
import { NewTag } from "@/components/Badges";
import { getSeenAt, isNew } from "@/lib/seen";

export const metadata = { title: "Flashcards" };

const DIFF_TINT: Record<string, string> = { easy: "bg-lilac", medium: "border-sun bg-sun-tint", hard: "border-grape/40 bg-grape-tint text-grape", mixed: "bg-white" };

export default async function Flashcards({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, isOwner } = await requireRoom(id);
  const seenAt = await getSeenAt(supabase, id, user.id, "flashcards");

  const { data: decks } = await supabase
    .from("decks")
    .select("id, title, difficulty, created_at, created_by, profiles(username), cards(count)")
    .eq("room_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-6">
      <MarkSeen roomId={id} section="flashcards" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Flashcard decks</h2>
        <Link href={`/rooms/${id}/flashcards/new`} className="btn btn-sun">
          <Plus size={18} /> New deck
        </Link>
      </div>

      {!decks?.length ? (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <Mascot size={80} mood="think" />
          <p className="mt-3 font-display text-lg font-semibold">No decks yet</p>
          <p className="text-sm text-ink-soft">Make one from your uploaded materials in a few seconds.</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {decks.map((d) => {
            const count = (d.cards as unknown as { count: number }[])?.[0]?.count ?? 0;
            const author = (d.profiles as unknown as { username: string | null })?.username ?? "someone";
            return (
              <li key={d.id} className="card card-link relative flex flex-col p-5">
                {/* stacked-cards look */}
                <span aria-hidden className="absolute -right-2 -top-2 -z-10 h-full w-full rounded-[22px] border-2 border-sun bg-sun-tint" />
                <Link href={`/rooms/${id}/flashcards/${d.id}`} className="flex-1">
                  <p className="flex items-center gap-2 text-lg font-semibold leading-snug">
                    <span>{d.title}</span> <NewTag show={isNew(d.created_at, d.created_by, seenAt, user.id)} />
                    <LinkSpinner className="size-4 text-grape" />
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {count} cards · by {author}
                  </p>
                </Link>
                <div className="mt-4 flex items-center justify-between">
                  <span className={`chip capitalize ${DIFF_TINT[d.difficulty] ?? ""}`}>{d.difficulty}</span>
                  {(d.created_by === user.id || isOwner) && (
                    <DeleteButton table="decks" id={d.id} label={`Delete deck ${d.title}`} confirmText="Delete this deck?" />
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
