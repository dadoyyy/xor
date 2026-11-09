import { requireRoom } from "@/services/authService";
import { MaterialsClient, type MaterialRow } from "@/features/materials";
import MarkSeen from "@/components/ui/MarkSeen";
import { getSeenAt, isNew } from "@/services/seenService";

export default async function RoomHome({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const { supabase, user, isOwner, canEdit, role } = await requireRoom(id);

  // Parallelize seenAt and materials queries
  const [seenAt, matRes] = await Promise.all([
    getSeenAt(supabase, id, user.id, "materials"),
    supabase
      .from("materials")
      .select("id, title, file_path, file_size, status, page_count, error, uploaded_by, created_at, processing_started_at, profiles(username)")
      .eq("subject_id", id)
      .order("created_at", { ascending: false }),
  ]);

  let data = matRes.data;
  if (matRes.error) {
    const { data: legacyMat } = await supabase
      .from("materials")
      .select("id, title, file_path, file_size, status, page_count, error, uploaded_by, created_at, processing_started_at, profiles(username)")
      .eq("room_id", id)
      .order("created_at", { ascending: false });
    if (legacyMat) data = legacyMat;
  }

  const materials: MaterialRow[] = (data ?? []).map((m) => ({
    id: m.id,
    title: m.title,
    filePath: m.file_path,
    fileSize: m.file_size,
    status: m.status,
    pageCount: m.page_count,
    error: m.error,
    uploadedBy: m.uploaded_by,
    uploader: (m.profiles as unknown as { username: string | null })?.username ?? "someone",
    createdAt: m.created_at,
    processingStartedAt: m.processing_started_at,
    isNew: isNew(m.created_at, m.uploaded_by, seenAt, user.id),
  }));

  return (
    <>
      <MarkSeen roomId={id} section="materials" />
      <MaterialsClient
        roomId={id}
        meId={user.id}
        isOwner={isOwner}
        canEdit={canEdit}
        role={role}
        materials={materials}
        justCreated={created === "1" && isOwner}
      />
    </>
  );
}

