import { after } from "next/server";
import { apiMember, errorResponse, HttpError } from "@/lib/auth";
import { createAdmin, createClient } from "@/lib/supabase/server";
import { useQuota } from "@/lib/limits";
import { extractStudyNotes, friendlyAIError } from "@/lib/ai/gemini";

export const maxDuration = 300;

function countPdfPages(buf: ArrayBuffer) {
  // Rough page count from the PDF structure; good enough for display.
  const text = new TextDecoder("latin1").decode(buf);
  const m = text.match(/\/Type\s*\/Page(?!s)/g);
  return m ? m.length : null;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: material } = await supabase
      .from("materials")
      .select("id, room_id, uploaded_by, title, file_path, status, processing_started_at")
      .eq("id", id)
      .maybeSingle();
    if (!material) throw new HttpError(404, "File not found.");

    const { user, isOwner } = await apiMember(material.room_id);
    if (material.uploaded_by !== user.id && !isOwner) throw new HttpError(403, "Only the uploader or room owner can do this.");
    const stale =
      material.status === "processing" &&
      (!material.processing_started_at || Date.now() - new Date(material.processing_started_at).getTime() > 6 * 60 * 1000);
    if (material.status === "processing" && !stale) return Response.json({ ok: true, status: "processing" });
    if (material.status === "ready") return Response.json({ ok: true, status: "ready" });
    if (!material.file_path) throw new HttpError(400, "This file has no PDF attached.");

    const refund = await useQuota(user.id, "process");

    const admin = createAdmin();
    await admin.from("materials").update({ status: "processing", error: null, processing_started_at: new Date().toISOString() }).eq("id", id);

    after(async () => {
      try {
        const { data: blob, error } = await admin.storage.from("materials").download(material.file_path!);
        if (error || !blob) throw new Error("Couldn't load the PDF from storage.");
        const buf = await blob.arrayBuffer();
        const pages = countPdfPages(buf);
        const notes = await extractStudyNotes(new Blob([buf], { type: "application/pdf" }), material.title);
        if (notes.length < 40) throw new Error("No readable content was found in this PDF.");
        await admin.from("materials").update({ status: "ready", content: notes, page_count: pages, error: null }).eq("id", id);
      } catch (e) {
        console.error("process failed", e);
        const err = friendlyAIError(e);
        if (err.retryable) await refund().catch(() => {});
        await admin.from("materials").update({ status: "failed", error: err.message.slice(0, 300) }).eq("id", id);
      }
    });

    return Response.json({ ok: true, status: "processing" }, { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
