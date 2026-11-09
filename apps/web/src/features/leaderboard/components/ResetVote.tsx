"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/ui/Feedback";
import { cancelResetPoll, castResetVote, startResetPoll } from "../services/leaderboardService";
import type { ResetPoll } from "../types";
import { RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";

export default function ResetVote({
  roomId,
  meId,
  isOwner,
  memberCount,
  poll,
}: {
  roomId: string;
  meId: string;
  isOwner: boolean;
  memberCount: number;
  poll: ResetPoll | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { confirm, toast } = useFeedback();

  const yes = poll?.votes.filter((v) => v.approve).length ?? 0;
  const no = poll?.votes.filter((v) => !v.approve).length ?? 0;
  const needed = Math.floor(memberCount / 2) + 1;
  const mine = poll?.votes.find((v) => v.user_id === meId);

  async function call(fn: () => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
    setBusy(true);
    const { data, error } = await fn();
    setBusy(false);
    if (error) return toast({ kind: "error", title: "That didn't work", body: error.message });
    if (data === "passed") toast({ title: "Vote passed", body: "The leaderboard has been reset." });
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <RotateCcw size={18} /> Reset leaderboard
      </h3>

      {!poll ? (
        <>
          <p className="mt-2 text-sm text-ink-soft">
            Scores are never reset unless the room votes for it. The owner starts a vote, and it passes when more than half
            of the members agree. After a reset, everyone&apos;s next try at each quiz counts again.
          </p>
          {isOwner ? (
            <button
              className="btn btn-sm mt-4"
              disabled={busy}
              onClick={async () => {
                const ok = await confirm({
                  title: "Start a reset vote?",
                  body: "Members have 48 hours to vote. Scores reset only if more than half agree.",
                  confirmLabel: "Start vote",
                });
                if (ok) call(() => startResetPoll(roomId));
              }}
            >
              Start a reset vote
            </button>
          ) : (
            <p className="mt-3 text-sm font-semibold">Only the owner can start a vote.</p>
          )}
        </>
      ) : (
        <>
          <p className="mt-2 text-sm font-semibold">A vote to reset the leaderboard is open.</p>
          <div className="mt-3 h-4 overflow-hidden rounded-full bg-lilac" aria-hidden>
            <div className="h-full rounded-full bg-grape" style={{ width: `${Math.min(100, (yes / needed) * 100)}%` }} />
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {yes} of {needed} yes votes needed · {no} no · ends {new Date(poll.expiresAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className={`btn btn-sm ${mine?.approve === true ? "btn-primary" : ""}`}
              disabled={busy}
              onClick={() => call(() => castResetVote(poll.id, true))}
            >
              <ThumbsUp size={16} /> Reset
            </button>
            <button
              className={`btn btn-sm ${mine?.approve === false ? "btn-sun" : ""}`}
              disabled={busy}
              onClick={() => call(() => castResetVote(poll.id, false))}
            >
              <ThumbsDown size={16} /> Keep
            </button>
          </div>
          {mine && <p className="mt-2 text-xs text-ink-soft">You voted {mine.approve ? "to reset" : "to keep scores"}. You can change it.</p>}
          {isOwner && (
            <button
              className="btn btn-ghost btn-sm mt-3"
              disabled={busy}
              onClick={() => call(() => cancelResetPoll(poll.id))}
            >
              Cancel vote
            </button>
          )}
        </>
      )}
    </div>
  );
}

