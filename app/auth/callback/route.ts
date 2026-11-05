import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Turn Supabase's technical auth errors into something a person can act on. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("code verifier") || m.includes("pkce") || m.includes("code challenge") || m.includes("flow state"))
    return "Google sign-in started in one browser but finished in another (this happens in Messenger, Instagram and other in-app browsers). Open xor in Safari or Chrome and try again, or log in with email.";
  if (m.includes("expired") || m.includes("invalid")) return "That sign-in link expired. Try again.";
  if (m.includes("access_denied") || m.includes("denied")) return "Google sign-in was cancelled.";
  return message;
}

// Google sign-in, email confirmation and password reset links all land here.
// Google works for both new and returning people: a new Google account is created
// automatically and sent to pick a username first.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") || "/rooms";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/rooms";

  const supabase = await createClient();

  // where to go once signed in: new accounts set a username first
  const destination = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    if (next === "/reset-password") return next;
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
    return profile?.username ? next : "/onboarding";
  };

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${(await destination()) ?? next}`);
    // the link may have been opened twice, or in a browser that's already signed in
    const already = await destination();
    if (already) return NextResponse.redirect(`${origin}${already}`);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(friendly(error.message))}`);
  }

  const desc = searchParams.get("error_description") || searchParams.get("error") || "That link didn't work. Try again.";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(friendly(desc))}`);
}
