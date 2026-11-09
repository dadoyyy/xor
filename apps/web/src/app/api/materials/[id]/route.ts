import { apiSubjectMember, errorResponse, HttpError } from "@/services/authService";
import { createAdmin, createClient } from "@/lib/supabase/server";

// Lightweight status check for single material row
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: material } = await supabase
      .from("materials")
      .select("id, status, error, page_count, subject_id")
      .eq("id", id)
      .maybeSingle();
    if (!material) throw new HttpError(404, "File not found.");

    await apiSubjectMember(material.subject_id);
    return Response.json({
      id: material.id,
      status: material.status,
      error: material.error,
      pageCount: material.page_count,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

// Uploader (with edit access) can delete their own file; the subject owner can delete any file.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: material } = await supabase
      .from("materials")
      .select("id, subject_id, uploaded_by, file_path")
      .eq("id", id)
      .maybeSingle();
    if (!material) throw new HttpError(404, "File not found.");

    const { user, isOwner, canEdit } = await apiSubjectMember(material.subject_id, { requireEdit: true });
    if ((material.uploaded_by !== user.id || !canEdit) && !isOwner) {
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
