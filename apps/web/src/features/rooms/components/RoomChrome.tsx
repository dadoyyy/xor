"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Crown, Edit3, Eye, UserPlus } from "lucide-react";
import { useRoomUpdates } from "@/hooks/useRoomUpdates";
import { useFeedback } from "@/components/ui/Feedback";

export type MemberSummary = {
  userId: string;
  username: string;
};

export default function RoomChrome({
  roomId,
  name,
  description,
  isOwner,
  canEdit = false,
  username,
  members = [],
  shareKey = null,
  children,
}: {
  roomId: string;
  name: string;
  description: string | null;
  isOwner: boolean;
  canEdit?: boolean;
  username: string;
  members?: MemberSummary[];
  shareKey?: string | null;
  children: React.ReactNode;
}) {
  const updates = useRoomUpdates(roomId);
  const { toast } = useFeedback();
  const [copied, setCopied] = useState(false);

  const inviteLink =
    typeof window !== "undefined" && shareKey
      ? `${window.location.origin}/join/${shareKey}`
      : "";

  async function handleCopyInvite() {
    if (!inviteLink && !shareKey) return;
    try {
      const textToCopy = inviteLink || shareKey || "";
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast({
        title: "Invite link copied!",
        body: "Share this link with classmates so they can join this subject.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: `Invite key: ${shareKey}`,
        body: "Copy this key to share with friends.",
      });
    }
  }

  // Display up to 4 avatar bubbles
  const visibleMembers = members.slice(0, 4);
  const overflowCount = members.length > 4 ? members.length - 4 : 0;

  const roleLabel = isOwner ? "Owner" : canEdit ? "Editor" : "Viewer";
  const RoleIcon = isOwner ? Crown : canEdit ? Edit3 : Eye;
  const roleClass = isOwner
    ? "bg-[#FFF1C2] text-ink"
    : canEdit
      ? "bg-[#EFE9FF] text-[#6D3BE8]"
      : "bg-[#F7F5FF] text-ink-soft";

  return (
    <div className="mx-auto max-w-6xl w-full pb-16 pt-3 px-3 sm:px-6">
      {/* Compact Subject Header Inside Sheet */}
      <div className="rounded-[20px] bg-[#F7F5FF] p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shadow-none select-none">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-ink truncate">
              {name}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${roleClass}`}
            >
              <RoleIcon size={12} />
              <span>{roleLabel}</span>
            </span>
          </div>
          {description && (
            <p className="mt-1 text-xs sm:text-sm text-ink-soft line-clamp-1 max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Right Header Controls: Member Avatars + Compact Invite Button */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Overlapping Member Avatars */}
          {members.length > 0 && (
            <div
              className="flex items-center -space-x-2"
              title={`${members.length} member${members.length === 1 ? "" : "s"}`}
            >
              {visibleMembers.map((m) => (
                <div
                  key={m.userId}
                  className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-white font-display text-[11px] font-bold text-[#6D3BE8] ring-2 ring-[#F7F5FF]"
                  title={m.username}
                >
                  {m.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="flex size-7 sm:size-8 items-center justify-center rounded-full bg-[#6D3BE8] text-white font-display text-[10px] font-bold ring-2 ring-[#F7F5FF]">
                  +{overflowCount}
                </div>
              )}
            </div>
          )}

          {/* Invite Actions (Owner & Editors) */}
          {(canEdit || isOwner) && shareKey && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyInvite}
                className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs shadow-none"
              >
                <UserPlus size={14} />
                <span>Invite friends</span>
              </button>

              <button
                type="button"
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-mono text-xs font-bold text-ink-soft hover:text-[#6D3BE8] transition-colors"
                title="Click to copy invite link"
              >
                <span>{shareKey}</span>
                {copied ? <Check size={13} className="text-mint" /> : <Copy size={13} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="mt-4 sm:mt-6">{children}</div>
    </div>
  );
}
