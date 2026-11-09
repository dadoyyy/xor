import { createClient } from "@/lib/supabase/client";

export async function startMaterialProcessing(id: string): Promise<void> {
  const res = await fetch(`/api/materials/${id}/process`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Couldn't start reading the file.");
  }
}

export async function uploadMaterialFile(
  roomId: string,
  meId: string,
  file: File,
): Promise<{ id: string; title: string }> {
  const supabase = createClient();
  const path = `${roomId}/${crypto.randomUUID()}.pdf`;
  const up = await supabase.storage.from("materials").upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (up.error) throw up.error;
  const title = file.name.replace(/\.pdf$/i, "").slice(0, 120) || "Untitled";
  const { data, error } = await supabase
    .from("materials")
    .insert({ subject_id: roomId, uploaded_by: meId, title, file_path: path, file_size: file.size })
    .select("id")
    .single();
  if (error) throw error;
  await startMaterialProcessing(data.id);
  return { id: data.id, title };
}

export async function deleteMaterialById(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.error };
  }
  return { ok: true };
}

export async function getMaterialSignedUrl(filePath: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("materials").createSignedUrl(filePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

export async function fetchMaterialNotes(id: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.from("materials").select("content").eq("id", id).single();
  if (error) throw error;
  return data.content ?? "";
}

