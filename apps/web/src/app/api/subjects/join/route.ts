import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // 0. Origin / CSRF verification
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    const host = req.headers.get("host");

    if (origin) {
      try {
        const originHost = new URL(origin).host;
        if (host && originHost !== host) {
          return NextResponse.json({ error: "Invalid request origin (CSRF check failed)." }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Malformed origin header." }, { status: 400 });
      }
    } else if (referer) {
      try {
        const refererHost = new URL(referer).host;
        if (host && refererHost !== host) {
          return NextResponse.json({ error: "Invalid request referer (CSRF check failed)." }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Malformed referer header." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Missing origin header (CSRF check failed)." }, { status: 403 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Please sign in first to join this subject." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawKey = typeof body.key === "string" ? body.key.trim() : "";
    const cleanKey = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (!cleanKey || cleanKey.length < 4) {
      return NextResponse.json({ error: "Please enter a valid invite key." }, { status: 400 });
    }

    // 1. Check rate limit
    const { count: failuresCount } = await supabase
      .from("join_failures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if ((failuresCount ?? 0) >= 8) {
      return NextResponse.json(
        { error: "Too many failed join attempts. Please try again in 10 minutes." },
        { status: 429 },
      );
    }

    // 2. Check preview status to distinguish wrong vs paused keys
    const { data: previewData } = await supabase.rpc("preview_subject_by_key", {
      p_key: cleanKey,
    });

    const preview = Array.isArray(previewData) && previewData.length > 0 ? previewData[0] : null;

    if (!preview) {
      try {
        await supabase.from("join_failures").insert({ user_id: user.id });
      } catch {}
      return NextResponse.json(
        { error: "Invalid or expired invite key. Check the key and try again." },
        { status: 404 },
      );
    }

    if (!preview.share_enabled) {
      return NextResponse.json(
        { error: "Invites have been paused by the owner for this subject." },
        { status: 403 },
      );
    }

    // 3. Add to library
    const { data: subjectId, error: joinErr } = await supabase.rpc("add_shared_subject", {
      p_key: cleanKey,
    });

    if (joinErr || !subjectId) {
      return NextResponse.json(
        { error: joinErr?.message || "Could not join subject. Please try again." },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, subjectId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
