import { requireRoom } from "@/lib/auth";
import MaterialsClient, { type MaterialRow } from "./MaterialsClient";

export default async function RoomHome({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const { supabase, user, isOwner } = await requireRoom(id);

  const { data } = await supabase
    .from("materials")
    .select("id, title, file_path, file_size, status, page_count, error, uploaded_by, created_at, processing_started_at, profiles(username)")
    .eq("room_id", id)
    .order("created_at", { ascending: false });

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
  }));

  return (
    <MaterialsClient roomId={id} meId={user.id} isOwner={isOwner} materials={materials} justCreated={created === "1" && isOwner} />
  );
}
