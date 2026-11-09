import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Mascot, { Logo } from "@/components/ui/Mascot";
import SubjectCover from "@/features/subjects/components/SubjectCover";
import JoinConfirmationClient from "@/features/rooms/components/JoinConfirmationClient";
import { Users, AlertTriangle, ArrowRight } from "lucide-react";

export const metadata = { title: "xor" };

export default async function JoinKeyPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const cleanKey = (key ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Rate-limit check on preview lookups
  if (user) {
    const { count: failuresCount } = await supabase
      .from("join_failures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if ((failuresCount ?? 0) >= 8) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-sky px-4 py-12 text-center text-ink">
          <div className="card max-w-md p-8">
            <Mascot mood="sleepy" size={110} className="mx-auto" />
            <h1 className="mt-4 font-display text-2xl font-bold">Too Many Attempts</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Too many failed join attempts. Please wait 10 minutes before trying again.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/subjects" className="btn btn-primary justify-center">
                Go to Subjects
              </Link>
              <Link href="/" className="btn btn-ghost justify-center">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  // 2. Fetch preview of the subject by key
  const { data: previewData } = await supabase.rpc("preview_subject_by_key", {
    p_key: cleanKey,
  });

  const preview = Array.isArray(previewData) && previewData.length > 0 ? previewData[0] : null;

  // 3. Error case: Key not found
  if (!preview) {
    if (user) {
      try {
        await supabase.from("join_failures").insert({ user_id: user.id });
      } catch {}
    }
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-sky px-4 py-12 text-center text-ink">
        <div className="card max-w-md p-8">
          <Mascot mood="confused" size={110} className="mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-bold">Invite Key Not Found</h1>
          <p className="mt-2 text-sm text-ink-soft">
            This invite link or key does not match any existing subject. Please double-check the key and try again.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/subjects" className="btn btn-primary justify-center">
              Go to Subjects
            </Link>
            <Link href="/" className="btn btn-ghost justify-center">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Error case: Invites paused by owner (do not leak subject details)
  if (!preview.share_enabled) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-sky px-4 py-12 text-center text-ink">
        <div className="card max-w-md p-8">
          <Mascot mood="sleepy" size={110} className="mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-bold">Invites Are Paused</h1>
          <p className="mt-2 text-sm text-ink-soft">
            The owner of this subject has temporarily paused new invitations.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/subjects" className="btn btn-primary justify-center">
              Go to Subjects
            </Link>
            <Link href="/" className="btn btn-ghost justify-center">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Logged-out case: Prompt user to log in or sign up, then return
  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-sky px-4 py-12 text-center text-ink">
        <div className="card max-w-lg p-8 overflow-hidden">
          <SubjectCover
            subjectId={preview.id}
            className="h-28 sm:h-32 w-full rounded-[14px] mb-4"
            size="md"
          />
          <div className="mb-4 flex justify-center">
            <Logo size={42} />
          </div>
          <Mascot mood="welcome" size={110} className="mx-auto" />
          <span className="chip mt-3 border-line bg-lilac/50 text-xs font-bold text-grape">
            You&apos;re Invited!
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            {preview.name}
          </h1>
          {preview.description && (
            <p className="mt-2 text-sm text-ink-soft max-w-sm mx-auto">
              {preview.description}
            </p>
          )}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-ink-soft">
            {preview.owner_username && <span>By @{preview.owner_username}</span>}
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users size={14} /> {preview.member_count} {Number(preview.member_count) === 1 ? "member" : "members"}
            </span>
          </div>

          <div className="mt-8 flex flex-col gap-2.5">
            <Link
              href={`/login?next=/join/${encodeURIComponent(cleanKey)}`}
              className="btn btn-primary w-full justify-center text-base"
            >
              Log in to accept invite
            </Link>
            <Link
              href={`/signup?next=/join/${encodeURIComponent(cleanKey)}`}
              className="btn btn-ghost border-2 border-line w-full justify-center text-base"
            >
              Sign up free
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 5. Check if user is rate-limited on join attempts
  const { count: failuresCount } = await supabase
    .from("join_failures")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

  if ((failuresCount ?? 0) >= 8) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-sky px-4 py-12 text-center text-ink">
        <div className="card max-w-md p-8">
          <Mascot mood="confused" size={110} className="mx-auto" />
          <h1 className="mt-4 font-display text-2xl font-bold">Too Many Attempts</h1>
          <p className="mt-2 text-sm text-ink-soft">
            You have entered too many wrong keys recently. Please wait 10 minutes before trying again.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/subjects" className="btn btn-primary justify-center">
              Go to Subjects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 6. Logged-in valid confirmation screen
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-sky px-4 py-12 text-ink">
      <JoinConfirmationClient
        subjectId={preview.id}
        name={preview.name}
        description={preview.description}
        ownerUsername={preview.owner_username}
        memberCount={Number(preview.member_count || 1)}
        cleanKey={cleanKey}
      />
    </div>
  );
}
