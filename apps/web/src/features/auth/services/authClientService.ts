import { createClient } from "@/lib/supabase/client";

export async function signInWithGoogleOAuth(redirectTo: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string, emailRedirectTo: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updateUserPassword(password: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function saveUsername(username: string) {
  const res = await fetch("/api/profile/username", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to save username.");
  }
}

