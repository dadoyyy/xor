"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Crown, Loader2, X } from "lucide-react";
import { transferSubjectOwnership } from "../services/memberService";
import { useFeedback } from "@/components/ui/Feedback";

export default function TransferOwnershipDialog({
  subjectId,
  subjectName,
  candidates,
  onClose,
  onTransferred,
}: {
  subjectId: string;
  subjectName: string;
  candidates: { userId: string; username: string }[];
  onClose: () => void;
  onTransferred: () => void;
}) {
  const [selectedUser, setSelectedUser] = useState<string>(candidates[0]?.userId ?? "");
  const [confirmName, setConfirmName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useFeedback();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const candidate = candidates.find((c) => c.userId === selectedUser);
  const isMatch = confirmName.trim().toLowerCase() === subjectName.trim().toLowerCase();

  async function handleTransfer() {
    if (!selectedUser) {
      setError("Please select a member to receive ownership.");
      return;
    }
    if (!isMatch) {
      setError(`Type "${subjectName}" exactly to confirm transfer.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await transferSubjectOwnership(subjectId, selectedUser);
      toast({
        title: "Ownership transferred",
        body: `${candidate?.username ?? "The member"} is now the owner of this subject. You are now an Editor.`,
      });
      onTransferred();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to transfer ownership.");
      setSubmitting(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fade-in absolute inset-0 bg-ink/40 backdrop-blur-xs" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-title"
        className="pop relative w-full max-w-lg rounded-xl border border-line bg-paper p-6 modal-box"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[10px] bg-sun-tint text-sun">
              <Crown size={20} />
            </span>
            <div>
              <h2 id="transfer-title" className="font-display text-lg font-bold">
                Transfer Ownership
              </h2>
              <p className="text-xs text-ink-soft">Make another member the owner of {subjectName}</p>
            </div>
          </div>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-lilac"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </header>

        <div className="mt-4 space-y-4">
          {candidates.length === 0 ? (
            <p className="rounded-2xl border-2 border-line bg-lilac/50 p-4 text-center text-sm text-ink-soft">
              No other members in this subject. Share the key with a collaborator first!
            </p>
          ) : (
            <>
              <div>
                <label className="label mb-1.5 block" htmlFor="new-owner-select">
                  Select new owner
                </label>
                <select
                  id="new-owner-select"
                  className="input w-full"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  disabled={submitting}
                >
                  {candidates.map((c) => (
                    <option key={c.userId} value={c.userId}>
                      {c.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border-2 border-sun/40 bg-sun-tint/50 p-3.5 text-xs text-ink-soft">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-sun" />
                  <div>
                    <strong className="font-bold text-ink">Important:</strong> Once transferred,{" "}
                    <strong>{candidate?.username}</strong> will be the sole owner. You will become an{" "}
                    <strong>Editor</strong> and will no longer control member roles, sharing toggles, or subject deletion.
                  </div>
                </div>
              </div>

              <div>
                <label className="label mb-1.5 block" htmlFor="confirm-subject-name">
                  Type <span className="font-bold text-ink font-mono">{subjectName}</span> to confirm
                </label>
                <input
                  id="confirm-subject-name"
                  type="text"
                  className="input w-full"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={subjectName}
                  disabled={submitting}
                />
              </div>

              {error && (
                <p className="rounded-xl border-2 border-coral bg-coral-tint px-3 py-2 text-xs font-semibold text-coral">
                  {error}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-2.5">
                <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-coral"
                  onClick={handleTransfer}
                  disabled={!isMatch || submitting || !selectedUser}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                  Transfer Ownership
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

