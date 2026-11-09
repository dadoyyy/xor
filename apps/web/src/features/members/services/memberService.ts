import { createClient } from "@/lib/supabase/client";

export async function getSubjectShareKey(subjectId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_subject_share_key", { p_subject: subjectId });
  if (error) throw error;
  return data as string;
}

export async function regenerateSubjectShareKey(subjectId: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("regenerate_subject_share_key", { p_subject: subjectId });
  if (error) throw error;
  return data as string;
}

export async function setSubjectSharing(
  subjectId: string,
  shareEnabled: boolean,
  allowFork: boolean,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_subject_sharing", {
    p_subject: subjectId,
    p_share_enabled: shareEnabled,
    p_allow_fork: allowFork,
  });
  if (error) throw error;
}

export async function setMemberRole(
  subjectId: string,
  userId: string,
  role: "editor" | "viewer",
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_member_role", {
    p_subject: subjectId,
    p_user: userId,
    p_role: role,
  });
  if (error) throw error;
}

export async function transferSubjectOwnership(subjectId: string, newOwnerId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("transfer_subject_ownership", {
    p_subject: subjectId,
    p_new_owner: newOwnerId,
  });
  if (error) throw error;
}

export async function removeLibraryMember(subjectId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_library_entry", { p_subject: subjectId, p_user: userId });
  if (error) throw error;
}

export async function updateSubjectDetails(subjectId: string, name: string, description: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_subject", {
    p_subject: subjectId,
    p_name: name,
    p_description: description,
  });
  if (error) throw error;
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const res = await fetch(`/api/subjects/${subjectId}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error);
}

// Backwards-compatible aliases
export const regenerateRoomKey = regenerateSubjectShareKey;
export const removeRoomMember = removeLibraryMember;
export const updateRoomDetails = updateSubjectDetails;
export const deleteRoom = deleteSubject;
