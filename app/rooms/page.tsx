import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import TopBar from "@/components/TopBar";
import Mascot from "@/components/Mascot";
import RoomsHeader from "./RoomsHeader";
import RoomCardMenu from "./RoomCardMenu";
import RoomCover from "@/components/RoomCover";
import { Crown, Users } from "lucide-react";

export const metadata = { title: "Your rooms" };

export default async function Rooms({ searchParams }: { searchParams: Promise<{ missing?: string }> }) {
  const { supabase, user, profile } = await requireProfile();
  const { missing } = await searchParams;

  // Card designs need migration 002 (rooms.cover). Fall back gracefully if it hasn't been run yet.
  type Membership = { role: string; joined_at: string; rooms: unknown };
  let coversEnabled = true;
  let memberships: Membership[] | null = null;
  const withCover = await supabase
    .from("room_members")
    .select("role, joined_at, rooms(id, name, description, owner_id, cover)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });
  if (withCover.error) {
    coversEnabled = false;
    const plain = await supabase
      .from("room_members")
      .select("role, joined_at, rooms(id, name, description, owner_id)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false });
    memberships = plain.data as Membership[] | null;
  } else {
    memberships = withCover.data as Membership[] | null;
  }

  const roomIds = (memberships ?? []).map((m) => (m.rooms as unknown as { id: string }).id);
  const counts = new Map<string, number>();
  if (roomIds.length) {
    const { data: all } = await supabase.from("room_members").select("room_id").in("room_id", roomIds);
    for (const r of all ?? []) counts.set(r.room_id, (counts.get(r.room_id) ?? 0) + 1);
  }

  const rooms = (memberships ?? []).map((m) => ({
    role: m.role as string,
    cover: null as string | null,
    ...(m.rooms as unknown as { id: string; name: string; description: string | null; cover?: string | null }),
  }));

  return (
    <>
      <TopBar username={profile.username} />
      <main className="page-x w-full pb-20 pt-8 lg:pt-10">
        {missing && (
          <p className="mb-6 rounded-2xl border-2 border-coral bg-coral-tint px-4 py-3 font-semibold">
            That room doesn&apos;t exist or you&apos;re no longer a member.
          </p>
        )}
        <RoomsHeader username={profile.username} />

        {rooms.length === 0 ? (
          <div className="card mt-10 flex flex-col items-center px-6 py-14 text-center">
            <Mascot size={96} mood="sleepy" />
            <h2 className="mt-4 text-2xl font-semibold">No rooms yet</h2>
            <p className="mt-1 max-w-sm text-ink-soft">
              Create a room for your class or study group, or paste a secret key a friend sent you.
            </p>
          </div>
        ) : (
          <>
          <h2 className="mt-10 text-xl font-semibold">Your rooms</h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {rooms.map((r) => (
              <li key={r.id} className="relative">
                <Link
                  href={`/rooms/${r.id}`}
                  className="card flex h-full items-center gap-4 p-4 pr-14 transition-transform hover:-translate-y-1 sm:block sm:p-5"
                >
                  <RoomCover cover={r.cover} roomId={r.id} name={r.name} className="size-16 shrink-0 sm:mb-4 sm:h-24 sm:w-auto" big={false} />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-semibold">{r.name}</h2>
                    {r.description && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{r.description}</p>}
                    <div className="mt-2 flex items-center gap-2 text-sm font-bold text-ink-soft sm:mt-4">
                      <span className="chip">
                        <Users size={14} /> {counts.get(r.id) ?? 1}
                      </span>
                      {r.role === "owner" && (
                        <span className="chip border-sun bg-sun-tint text-ink">
                          <Crown size={14} /> Owner
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <RoomCardMenu
                  room={{ id: r.id, name: r.name, description: r.description, cover: r.cover ?? null, role: r.role }}
                  meId={user.id}
                  coversEnabled={coversEnabled}
                />
              </li>
            ))}
          </ul>
          </>
        )}
      </main>
    </>
  );
}
