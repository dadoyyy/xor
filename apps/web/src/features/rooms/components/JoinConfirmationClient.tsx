"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Users } from "lucide-react";
import Mascot from "@/components/ui/Mascot";
import SubjectCover from "@/features/subjects/components/SubjectCover";

export default function JoinConfirmationClient({
  subjectId,
  name,
  description,
  ownerUsername,
  memberCount,
  cleanKey,
}: {
  subjectId: string;
  name: string;
  description: string | null;
  ownerUsername: string | null;
  memberCount: number;
  cleanKey: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subjects/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: cleanKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not join subject.");
      }
      router.push(`/subjects/${data.subjectId || subjectId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="card w-full max-w-lg p-6 sm:p-8 text-center overflow-hidden">
      <SubjectCover
        subjectId={subjectId}
        className="h-28 sm:h-32 w-full rounded-[14px] mb-4"
        size="md"
      />
      <Mascot mood="excited" size={90} className="mx-auto" />

      <span className="chip mt-4 border-line bg-lilac/50 text-xs font-bold text-grape">
        Subject Invitation
      </span>

      <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl text-ink">
        {name}
      </h1>

      {description && (
        <p className="mt-2 text-sm text-ink-soft max-w-sm mx-auto">
          {description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-center gap-3 text-xs font-semibold text-ink-soft">
        {ownerUsername && <span>Created by <strong className="text-ink">@{ownerUsername}</strong></span>}
        <span>•</span>
        <span className="flex items-center gap-1">
          <Users size={14} /> {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border-2 border-coral bg-coral-tint p-3 text-xs font-bold text-ink">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleJoin}
          disabled={busy}
          className="btn btn-primary w-full justify-center text-base"
        >
          {busy ? (
            <span className="spinner" aria-hidden />
          ) : (
            <Check size={18} />
          )}
          {busy ? "Joining subject…" : "Join Subject"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/subjects")}
          disabled={busy}
          className="btn btn-ghost w-full justify-center text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

