import { requireRoom } from "@/lib/auth";
import RoomShell from "./RoomShell";

export default async function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { room, profile, isOwner } = await requireRoom(id);

  return (
    <RoomShell
      roomId={room.id}
      name={room.name}
      description={room.description}
      isOwner={isOwner}
      username={profile.username}
    >
      {children}
    </RoomShell>
  );
}
