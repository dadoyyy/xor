import { NextResponse } from "next/server";
import { createClient, createAdmin } from "@/lib/supabase/server";

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "system",
  "root",
  "support",
  "help",
  "api",
  "bot",
  "moderator",
  "staff",
  "xor",
  "team",
  "auth",
  "login",
  "signup",
  "onboarding",
  "settings",
  "null",
  "undefined",
  "anonymous",
  "official",
  "library",
  "subjects",
  "rooms",
  "calendar",
  "progress",
]);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim() : "";

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "Username must be between 3 and 20 characters." },
        { status: 400 },
      );
    }

    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores." },
        { status: 400 },
      );
    }

    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      return NextResponse.json(
        { error: "This username is reserved. Please pick another." },
        { status: 400 },
      );
    }

    // Call atomic security definer RPC set_my_username.
    // If the schema is missing or invalid, fail loudly.
    const { data: rpcData, error: rpcErr } = await supabase.rpc("set_my_username", {
      p_username: username,
    });

    if (rpcErr) {
      if (
        rpcErr.code === "23505" ||
        rpcErr.message?.toLowerCase().includes("taken") ||
        rpcErr.message?.includes("profiles_username_lower")
      ) {
        return NextResponse.json(
          { error: "That username is already taken. Try another." },
          { status: 400 },
        );
      }

      if (rpcErr.message?.toLowerCase().includes("reserved")) {
        return NextResponse.json(
          { error: rpcErr.message },
          { status: 400 },
        );
      }

      // Fail loudly on missing RPC or schema errors
      return NextResponse.json(
        { error: `Database error: ${rpcErr.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, username: (rpcData as string) || username });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

