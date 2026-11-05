import { requireRoom } from "@/lib/auth";
import MembersClient from "./MembersClient";
import MarkSeen from "@/components/MarkSeen";
import { getSeenAt, isNew } from "@/lib/seen";

export const metadata = { title: "Members" };

export default async function Members({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, room, user, isOwner } = await requireRoom(id);
  const seenAt = await getSeenAt(supabase, id, user.id, "members");

  const { data } = await supabase
    .from("room_members")
    .select("user_id, role, joined_at, profiles(username)")
    .eq("room_id", id)
    .order("joined_at");

  const members = (data ?? []).map((m) => ({
    userId: m.user_id as string,
    role: m.role as string,
    joinedAt: m.joined_at as string,
    username: (m.profiles as unknown as { username: string | null })?.username ?? "unknown",
    isNew: isNew(m.joined_at as string, m.user_id as string, seenAt, user.id),
  }));

  let secretKey: string | null = null;
  if (isOwner) {
    const { data: key } = await supabase.rpc("get_room_key", { p_room: id });
    secretKey = key as string;
  }

  return (
    <>
    <MarkSeen roomId={id} section="members" />
    <MembersClient
      roomId={id}
      roomName={room.name}
      roomDescription={room.description ?? ""}
      meId={user.id}
      isOwner={isOwner}
      secretKey={secretKey}
      members={members}
    />
    </>
  );
}
