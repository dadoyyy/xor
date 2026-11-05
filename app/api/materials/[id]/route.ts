import { apiMember, errorResponse, HttpError } from "@/lib/auth";
import { createAdmin, createClient } from "@/lib/supabase/server";

// Uploader can delete their own file; the room owner can delete any file.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: material } = await supabase
      .from("materials")
      .select("id, room_id, uploaded_by, file_path")
      .eq("id", id)
      .maybeSingle();
    if (!material) throw new HttpError(404, "File not found.");

    const { user, isOwner } = await apiMember(material.room_id);
    if (material.uploaded_by !== user.id && !isOwner) {
      throw new HttpError(403, "You can only delete files you uploaded.");
    }

    const admin = createAdmin();
    if (material.file_path) await admin.storage.from("materials").remove([material.file_path]);
    const { error } = await admin.from("materials").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
