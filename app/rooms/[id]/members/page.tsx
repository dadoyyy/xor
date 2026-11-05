import { requireRoom } from "@/lib/auth";
import MembersClient from "./MembersClient";

export const metadata = { title: "Members" };

export default async function Members({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, room, user, isOwner } = await requireRoom(id);

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
  }));

  let secretKey: string | null = null;
  if (isOwner) {
    const { data: key } = await supabase.rpc("get_room_key", { p_room: id });
    secretKey = key as string;
  }

  return (
    <MembersClient
      roomId={id}
      roomName={room.name}
      roomDescription={room.description ?? ""}
      meId={user.id}
      isOwner={isOwner}
      secretKey={secretKey}
      members={members}
    />
  );
}
