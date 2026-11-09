import { apiSubjectMember, errorResponse } from "@/services/authService";
import { createAdmin } from "@/lib/supabase/server";

// Owner deletes the whole subject, including its PDFs in storage.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await apiSubjectMember(id, { requireOwner: true });

    const admin = createAdmin();
    const { data: files } = await admin.storage.from("materials").list(id, { limit: 1000 });
    if (files?.length) {
      await admin.storage.from("materials").remove(files.map((f) => `${id}/${f.name}`));
    }
    const { error } = await admin.from("subjects").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

