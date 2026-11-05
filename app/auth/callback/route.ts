import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Google sign-in, email confirmation and password reset links all land here.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") || "/rooms";
  if (!next.startsWith("/") || next.startsWith("//")) next = "/rooms";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }
  const desc = searchParams.get("error_description") || "That link didn't work. Try again.";
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(desc)}`);
}
