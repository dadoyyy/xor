import { createClient } from "@/lib/supabase/client";

export async function addSharedSubjectByKey(key: string): Promise<string> {
  const supabase = createClient();
  let { data, error } = await supabase.rpc("add_shared_subject", { p_key: key });
  if (error) {
    const legacy = await supabase.rpc("join_room_by_key", { p_key: key });
    if (!legacy.error && legacy.data) {
      data = legacy.data;
      error = null;
    }
  }
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No subject matches that share key. Double-check it with the subject owner.");
  return data as string;
}

export async function createNewSubject(name: string, description: string | null): Promise<string> {
  const supabase = createClient();
  let { data, error } = await supabase.rpc("create_subject", { p_name: name, p_description: description });
  if (error) {
    const legacy = await supabase.rpc("create_room", { p_name: name, p_description: description });
    if (!legacy.error && legacy.data) {
      data = legacy.data;
      error = null;
    }
  }
  if (error) throw new Error(error.message);
  return data as string;
}

export async function deleteSubjectById(subjectId: string): Promise<void> {
  const res = await fetch(`/api/subjects/${subjectId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Couldn't delete the subject");
  }
}

export async function forkSubjectById(subjectId: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`/api/subjects/${subjectId}/fork`, { method: "POST" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || "Couldn't fork this subject.");
  }
  return { id: body.id as string, name: body.name as string };
}

export async function leaveSubjectById(subjectId: string, userId: string): Promise<void> {
  const { error } = await createClient().rpc("remove_library_entry", { p_subject: subjectId, p_user: userId });
  if (error) throw new Error(error.message);
}

export async function updateSubjectInfo(subjectId: string, name: string, description: string): Promise<void> {
  const { error } = await createClient().rpc("update_subject", {
    p_subject: subjectId,
    p_name: name,
    p_description: description,
  });
  if (error) throw new Error(error.message);
}

export async function setMySubjectCover(subjectId: string, cover: string): Promise<void> {
  const { error } = await createClient().rpc("set_my_subject_cover", { p_subject: subjectId, p_cover: cover });
  if (error) throw new Error(error.message);
}

export async function setSubjectPinned(subjectId: string, pinned: boolean): Promise<void> {
  const { error } = await createClient().rpc("set_subject_pinned", { p_subject: subjectId, p_pinned: pinned });
  if (error) throw new Error(error.message);
}

// Backwards-compatible aliases
export const joinRoomByKey = addSharedSubjectByKey;
export const createNewRoom = createNewSubject;
export const deleteRoomById = deleteSubjectById;
export const leaveRoomById = leaveSubjectById;
export const updateRoomInfo = updateSubjectInfo;
export const setMyRoomCover = setMySubjectCover;
