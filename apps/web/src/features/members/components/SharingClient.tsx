"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNav } from "@/hooks/useNav";
import { useFeedback } from "@/components/ui/Feedback";
import type { MemberRow } from "../types";
import { avatarCls, formatJoinedDate, initials } from "../utils";
import {
  deleteSubject,
  regenerateSubjectShareKey,
  removeLibraryMember,
  setMemberRole,
  setSubjectSharing,
  updateSubjectDetails,
} from "../services/memberService";
import TransferOwnershipDialog from "./TransferOwnershipDialog";
import {
  AlertTriangle,
  Check,
  Copy,
  Crown,
  Edit3,
  Eye,
  GitFork,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  Share2,
  Shield,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";

export default function SharingClient(props: {
  subjectId: string;
  subjectName: string;
  subjectDescription: string | null;
  meId: string;
  isOwner: boolean;
  canEdit: boolean;
  role: "owner" | "editor" | "viewer";
  shareKey: string | null;
  shareEnabled: boolean;
  allowFork: boolean;
  forkedFrom?: { id: string | null; name: string | null } | null;
  members: MemberRow[];
}) {
  const { subjectId, meId, isOwner, canEdit, role, members, forkedFrom } = props;
  const router = useRouter();
  const { go } = useNav();
  const { confirm, toast } = useFeedback();

  const [shareKey, setShareKey] = useState(props.shareKey);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareEnabled, setShareEnabled] = useState(props.shareEnabled);
  const [allowFork, setAllowFork] = useState(props.allowFork);
  const [working, setBusy] = useState<string | null>(null);

  // Subject details
  const [name, setName] = useState(props.subjectName);
  const [desc, setDesc] = useState(props.subjectDescription ?? "");
  const [savedDetails, setSavedDetails] = useState(false);

  // Ownership transfer dialog
  const [showTransfer, setShowTransfer] = useState(false);

  // Fork in-progress state
  const [forking, setForking] = useState(false);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast({
        kind: "error",
        title: "Action failed",
        body: e instanceof Error ? e.message : "Something went wrong.",
      });
    } finally {
      setBusy(null);
    }
  }

  const copyKey = () =>
    run("copy", async () => {
      if (!shareKey) return;
      await navigator.clipboard.writeText(shareKey);
      setCopied(true);
      toast({ title: "Share key copied!", body: "Anyone with this key can join as a Viewer." });
      setTimeout(() => setCopied(false), 1800);
    });

  const copyInviteLink = () =>
    run("invite", async () => {
      if (!shareKey) return;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const joinUrl = `${origin}/join/${shareKey}`;
      await navigator.clipboard.writeText(joinUrl);
      setCopiedLink(true);
      toast({
        title: "Invite link copied!",
        body: "Share this link with friends so they can join your subject instantly.",
      });
      setTimeout(() => setCopiedLink(false), 1800);
    });

  const handleRegenerateKey = () =>
    run("regen", async () => {
      const ok = await confirm({
        title: "Regenerate Share Key?",
        body: "The existing key will stop working immediately. Current members will remain in this subject.",
        confirmLabel: "Make new key",
      });
      if (!ok) return;
      const newKey = await regenerateSubjectShareKey(subjectId);
      setShareKey(newKey);
      setShowKey(true);
      toast({ title: "New key created", body: "Previous share key has been invalidated." });
      router.refresh();
    });

  const toggleShareEnabled = async (checked: boolean) => {
    setShareEnabled(checked);
    await run("toggle-share", async () => {
      await setSubjectSharing(subjectId, checked, allowFork);
      toast({
        title: checked ? "Key sharing enabled" : "Key sharing paused",
        body: checked
          ? "New members can join with the share key."
          : "Nobody can join via the share key until re-enabled.",
      });
      router.refresh();
    });
  };

  const toggleAllowFork = async (checked: boolean) => {
    setAllowFork(checked);
    await run("toggle-fork", async () => {
      await setSubjectSharing(subjectId, shareEnabled, checked);
      toast({
        title: checked ? "Forking enabled" : "Forking disabled",
        body: checked
          ? "Members can now copy this subject into their personal library."
          : "Members cannot copy or fork this subject.",
      });
      router.refresh();
    });
  };

  const handleRoleChange = (member: MemberRow, newRole: "editor" | "viewer") =>
    run(`role-${member.userId}`, async () => {
      await setMemberRole(subjectId, member.userId, newRole);
      toast({
        title: "Role updated",
        body: `${member.username} is now a ${newRole === "editor" ? "Editor (can edit)" : "Viewer (read-only)"}.`,
      });
      router.refresh();
    });

  const handleRemoveMember = (member: MemberRow) =>
    run(`rm-${member.userId}`, async () => {
      const ok = await confirm({
        title: `Remove ${member.username}?`,
        body: "They will lose access and will need the share key to join again.",
        confirmLabel: "Remove member",
        danger: true,
      });
      if (!ok) return;
      await removeLibraryMember(subjectId, member.userId);
      toast({ title: `${member.username} removed from subject.` });
      router.refresh();
    });

  const handleLeaveSubject = () =>
    run("leave", async () => {
      const ok = await confirm({
        title: "Leave this subject?",
        body: "This subject will be removed from your library. You can re-join anytime with the share key.",
        confirmLabel: "Leave subject",
        danger: true,
      });
      if (!ok) return;
      await removeLibraryMember(subjectId, meId);
      toast({ title: "You left the subject." });
      go("/rooms", { replace: true, refresh: true });
    });

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    run("save-details", async () => {
      await updateSubjectDetails(subjectId, name.trim(), desc.trim());
      setSavedDetails(true);
      toast({ title: "Subject details saved" });
      setTimeout(() => setSavedDetails(false), 2000);
      router.refresh();
    });
  };

  const handleDeleteSubject = () =>
    run("delete", async () => {
      const ok = await confirm({
        title: `Delete "${props.subjectName}"?`,
        body: "This will permanently delete this subject, all uploaded materials, decks, and quizzes for all members. This cannot be undone.",
        confirmLabel: "Delete everything",
        danger: true,
      });
      if (!ok) return;
      await deleteSubject(subjectId);
      toast({ title: "Subject deleted" });
      go("/rooms", { replace: true, refresh: true });
    });

  const handleForkSubject = async () => {
    const ok = await confirm({
      title: "Fork Subject to Your Library?",
      body: "This makes a complete private copy of this subject, its lecture materials, study decks, and quizzes under your own ownership.",
      confirmLabel: "Fork Subject",
    });
    if (!ok) return;

    setForking(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/fork`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fork subject.");

      toast({
        title: "Subject forked!",
        body: `Created "${data.subject.name}". Opening your new subject now...`,
      });
      go(`/rooms/${data.subject.id}`, { replace: true, refresh: true });
    } catch (e) {
      toast({
        kind: "error",
        title: "Fork failed",
        body: e instanceof Error ? e.message : "Something went wrong.",
      });
      setForking(false);
    }
  };

  const candidateNewOwners = members.filter((m) => m.userId !== meId);

  return (
    <div className="grid gap-6 select-none">
      {/* Fork Attribution Banner & Action */}
      <div className="rounded-[20px] bg-[#F7F5FF] flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center shadow-none">
        <div>
          {forkedFrom?.name && (
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#5223BD]">
              <GitFork size={13} /> Forked from {forkedFrom.name}
            </div>
          )}
          <h2 className="font-display text-base sm:text-lg font-bold text-ink">
            {isOwner ? "Subject Sharing & Permissions" : "Subject Collaboration"}
          </h2>
          <p className="text-xs text-ink-soft">
            {isOwner
              ? "Manage share keys, collaborator roles, forking permissions, and ownership."
              : `You are participating in this subject as a ${role.toUpperCase()}.`}
          </p>
        </div>

        {/* Fork button for non-owners when allowed */}
        {!isOwner && (allowFork || isOwner) && (
          <button
            type="button"
            className="btn btn-accent btn-sm shadow-none"
            onClick={handleForkSubject}
            disabled={forking}
          >
            {forking ? <Loader2 size={16} className="animate-spin" /> : <GitFork size={16} />}
            {forking ? "Forking Subject…" : "Fork to My Library"}
          </button>
        )}
      </div>

      {/* Share Key & Access Control Card (Owner view) */}
      {isOwner && (
        <section className="rounded-[20px] bg-[#F7F5FF] p-5 sm:p-6 shadow-none">
          <div className="flex items-center gap-3 border-b border-black/5 pb-3">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-[#5223BD]">
              <KeyRound size={18} />
            </span>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-ink">Share Key & Access</h3>
              <p className="text-xs text-ink-soft">New members who join with this key always start as Viewers.</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {/* Key Field */}
            <div>
              <label className="text-xs font-bold text-ink-soft mb-1.5 block">Subject Share Key</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    readOnly
                    value={shareKey ?? "••••••••••••••••"}
                    className="w-full rounded-[10px] bg-white px-3.5 py-2 font-mono text-xs font-bold tracking-wider text-ink outline-none border border-black/5"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
                    onClick={() => setShowKey(!showKey)}
                    title={showKey ? "Hide key" : "Show key"}
                  >
                    <Eye size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm shadow-none text-xs"
                  onClick={copyInviteLink}
                  disabled={!shareKey || working === "invite"}
                  title="Copy direct join link to invite friends"
                >
                  <Share2 size={15} />
                  <span>{copiedLink ? "Link Copied!" : "Invite friends"}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm shadow-none text-xs"
                  onClick={copyKey}
                  disabled={!shareKey || working === "copy"}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "Copied!" : "Copy Key"}</span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm shadow-none text-xs"
                  onClick={handleRegenerateKey}
                  disabled={working === "regen"}
                  title="Make a new key and invalidate the old one"
                >
                  <RefreshCw size={14} className={working === "regen" ? "animate-spin" : ""} />
                  <span>Regenerate</span>
                </button>
              </div>
            </div>

            {/* Sharing & Forking Toggles */}
            <div className="grid gap-3 rounded-[14px] bg-white p-3.5 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={shareEnabled}
                  onChange={(e) => toggleShareEnabled(e.target.checked)}
                  disabled={working === "toggle-share"}
                  className="mt-0.5 size-4 rounded accent-[#5223BD]"
                />
                <div>
                  <span className="block font-display text-xs font-bold text-ink">Allow Key Joins</span>
                  <span className="block text-[11px] text-ink-soft">
                    {shareEnabled
                      ? "Anyone with the key can join this subject."
                      : "Key joining is paused; no new members can enter."}
                  </span>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={allowFork}
                  onChange={(e) => toggleAllowFork(e.target.checked)}
                  disabled={working === "toggle-fork"}
                  className="mt-0.5 size-4 rounded accent-[#5223BD]"
                />
                <div>
                  <span className="block font-display text-xs font-bold text-ink">Allow Forking</span>
                  <span className="block text-[11px] text-ink-soft">
                    {allowFork
                      ? "Members can copy materials & quizzes to their own library."
                      : "Members cannot clone or fork this subject."}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </section>
      )}

      {/* Members & Role Management List */}
      <section className="rounded-[20px] bg-[#F7F5FF] p-5 sm:p-6 shadow-none">
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-[#5223BD]">
              <Users size={18} />
            </span>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-ink">Members & Roles</h3>
              <p className="text-xs text-ink-soft">
                {members.length} {members.length === 1 ? "member" : "members"} in this subject
              </p>
            </div>
          </div>

          {/* Transfer Ownership Shortcut for Owner */}
          {isOwner && candidateNewOwners.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm shadow-none text-xs font-bold"
              onClick={() => setShowTransfer(true)}
            >
              <Crown size={14} className="text-sun" /> Transfer Ownership
            </button>
          )}
        </div>

        <ul className="mt-3 divide-y divide-black/5">
          {members.map((m) => {
            const isMe = m.userId === meId;
            const isMemberOwner = m.role === "owner";
            const isMemberEditor = m.role === "editor";

            return (
              <li key={m.userId} className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 place-items-center justify-center rounded-full bg-white font-display text-xs font-bold text-[#5223BD]">
                    {initials(m.username)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs sm:text-sm font-bold text-ink">{m.username}</span>
                      {isMe && (
                        <span className="rounded-full bg-[#EFE9FF] px-2 py-0.5 text-[10px] font-bold text-[#5223BD]">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-ink-soft">Joined {formatJoinedDate(m.joinedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Role Badge or Selector */}
                  {isOwner && !isMe && !isMemberOwner ? (
                    <select
                      className="rounded-[10px] bg-white px-2.5 py-1 text-xs font-bold text-ink outline-none border border-black/5"
                      value={m.role}
                      onChange={(e) => handleRoleChange(m, e.target.value as "editor" | "viewer")}
                      disabled={working === `role-${m.userId}`}
                    >
                      <option value="editor">Editor (Can Edit)</option>
                      <option value="viewer">Viewer (Read Only)</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isMemberOwner
                          ? "bg-[#FFF1C2] text-ink"
                          : isMemberEditor
                            ? "bg-[#EFE9FF] text-[#5223BD]"
                            : "bg-white text-ink-soft"
                      }`}
                    >
                      {isMemberOwner ? <Crown size={12} /> : isMemberEditor ? <Edit3 size={12} /> : <Eye size={12} />}
                      {isMemberOwner ? "Owner" : isMemberEditor ? "Editor" : "Viewer"}
                    </span>
                  )}

                  {/* Remove Member Button */}
                  {isOwner && !isMe && !isMemberOwner && (
                    <button
                      type="button"
                      className="grid size-7 place-items-center rounded-full text-ink-soft hover:bg-coral/15 hover:text-coral transition-colors"
                      onClick={() => handleRemoveMember(m)}
                      disabled={working === `rm-${m.userId}`}
                      title={`Remove ${m.username}`}
                    >
                      <UserMinus size={15} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Subject Settings (Owner only) */}
      {isOwner && (
        <section className="rounded-[20px] bg-[#F7F5FF] p-5 sm:p-6 shadow-none">
          <h3 className="font-display text-sm sm:text-base font-bold text-ink">Subject Details</h3>
          <p className="text-xs text-ink-soft">Update the subject name and description.</p>

          <form onSubmit={handleSaveDetails} className="mt-3.5 space-y-3">
            <div>
              <label className="text-xs font-bold text-ink-soft mb-1 block" htmlFor="subject-name-input">
                Subject Name
              </label>
              <input
                id="subject-name-input"
                className="w-full rounded-[10px] bg-white px-3.5 py-2 text-xs font-bold text-ink outline-none border border-black/5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink-soft mb-1 block" htmlFor="subject-desc-input">
                Description (Optional)
              </label>
              <textarea
                id="subject-desc-input"
                className="w-full rounded-[10px] bg-white px-3.5 py-2 text-xs text-ink outline-none border border-black/5 resize-none h-20"
                rows={2}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                maxLength={280}
                placeholder="What is this subject about?"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={working === "save-details" || !name.trim()}
              >
                {savedDetails ? <Check size={16} /> : null}
                {savedDetails ? "Saved!" : working === "save-details" ? "Saving…" : "Save Details"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Danger Zone */}
      <section className="rounded-[20px] bg-[#FDE8E8]/60 p-5 sm:p-6 shadow-none">
        <h3 className="font-display text-sm sm:text-base font-bold text-coral">Danger Zone</h3>
        <p className="text-xs text-ink-soft">
          {isOwner
            ? "Permanently delete this subject and all its materials, flashcards, and quizzes."
            : "Leave this subject and remove it from your personal library."}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {isOwner ? (
            <button
              type="button"
              className="btn btn-coral btn-sm shadow-none text-xs"
              onClick={handleDeleteSubject}
              disabled={working === "delete"}
            >
              <Trash2 size={15} /> Delete Subject
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm shadow-none text-xs"
              onClick={handleLeaveSubject}
              disabled={working === "leave"}
            >
              <LogOut size={15} /> Leave Subject
            </button>
          )}
        </div>
      </section>

      {/* Transfer Ownership Dialog */}
      {showTransfer && (
        <TransferOwnershipDialog
          subjectId={subjectId}
          subjectName={name}
          candidates={candidateNewOwners}
          onClose={() => setShowTransfer(false)}
          onTransferred={() => {
            setShowTransfer(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

