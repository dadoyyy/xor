import { requireSubject } from "@/services/authService";
import { RoomShell } from "@/features/rooms";
import SubjectTabPrefetcher from "@/features/rooms/components/SubjectTabPrefetcher";
import type { MemberSummary } from "@/features/rooms/components/RoomChrome";

export default async function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, room, profile, isOwner, canEdit } = await requireSubject(id);

  // Fetch members and share key in parallel
  const [memberRes, shareKeyRes] = await Promise.all([
    supabase
      .from("library_entries")
      .select("user_id, profiles(username)")
      .eq("subject_id", id)
      .limit(6),
    canEdit || isOwner
      ? supabase.rpc("get_subject_share_key", { p_subject: id })
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (memberRes.error) {
    throw new Error(`Failed to load subject members: ${memberRes.error.message}`);
  }
  if (shareKeyRes.error) {
    throw new Error(`Failed to load subject share key: ${shareKeyRes.error.message}`);
  }

  let members: MemberSummary[] = [];
  if (memberRes.data && memberRes.data.length > 0) {
    members = memberRes.data.map((m: any) => ({
      userId: m.user_id,
      username: m.profiles?.username || "user",
    }));
  }

  const shareKey = (shareKeyRes.data as string | null) ?? null;

  return (
    <RoomShell
      roomId={room.id}
      name={room.name}
      description={room.description}
      isOwner={isOwner}
      canEdit={canEdit}
      username={profile.username}
      members={members}
      shareKey={shareKey}
    >
      <SubjectTabPrefetcher subjectId={room.id} />
      {children}
    </RoomShell>
  );
}
