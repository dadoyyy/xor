import { requireRoom } from "@/services/authService";
import { SharingClient } from "@/features/members";
import MarkSeen from "@/components/ui/MarkSeen";
import { getSeenAt, isNew } from "@/services/seenService";

export const metadata = { title: "xor" };

export default async function SharingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, room, user, isOwner, canEdit, role } = await requireRoom(id);

  // Parallelize seenAt, members, and share key queries
  const [seenAt, memRes, shareKeyRes] = await Promise.all([
    getSeenAt(supabase, id, user.id, "members"),
    supabase
      .from("library_entries")
      .select("user_id, role, added_at, profiles(username)")
      .eq("subject_id", id)
      .order("added_at"),
    isOwner
      ? supabase.rpc("get_subject_share_key", { p_subject: id })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (memRes.error) {
    throw new Error(`Failed to load members: ${memRes.error.message}`);
  }
  if (shareKeyRes.error) {
    throw new Error(`Failed to retrieve subject share key: ${shareKeyRes.error.message}`);
  }

  const data = memRes.data;
  const secretKey = (shareKeyRes.data as string | null) ?? null;

  const members = (data ?? []).map((m: any) => ({
    userId: m.user_id as string,
    role: m.role as string,
    joinedAt: m.added_at as string,
    username: (m.profiles as unknown as { username: string | null })?.username ?? "unknown",
    isNew: isNew(m.added_at as string, m.user_id as string, seenAt, user.id),
  }));

  return (
    <>
      <MarkSeen roomId={id} section="members" />
      <SharingClient
        subjectId={id}
        subjectName={room.name}
        subjectDescription={room.description ?? null}
        meId={user.id}
        isOwner={isOwner}
        canEdit={canEdit}
        role={role}
        shareKey={secretKey}
        shareEnabled={room.share_enabled ?? true}
        allowFork={room.allow_fork ?? true}
        forkedFrom={room.forked_from_id ? { id: room.forked_from_id, name: room.forked_from_name } : null}
        members={members}
      />
    </>
  );
}
