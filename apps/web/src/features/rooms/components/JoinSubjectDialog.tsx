"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, X } from "lucide-react";
import { addSharedSubjectByKey } from "../services/roomService";
import { useFeedback } from "@/components/ui/Feedback";

export default function JoinSubjectDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) return;

    setSubmitting(true);
    setError(null);
    try {
      const subjectId = await addSharedSubjectByKey(cleanKey);
      toast({ title: "Joined subject!", body: "Added to your library as a Viewer." });
      onClose();
      router.push(`/subjects/${subjectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join subject with that key.");
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
        aria-labelledby="join-subject-title"
        className="pop relative w-full max-w-md rounded-xl border border-line bg-paper p-6 modal-box"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[10px] bg-sun-tint text-sun">
              <KeyRound size={20} />
            </span>
            <div>
              <h2 id="join-subject-title" className="font-display text-lg font-bold">
                Join with a Share Key
              </h2>
              <p className="text-xs text-ink-soft">Enter the 16-character key from your classmate.</p>
            </div>
          </div>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-full text-ink-soft hover:bg-lilac transition-colors"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="label mb-1.5 block" htmlFor="share-key-input">
              Share Key
            </label>
            <input
              id="share-key-input"
              className="input w-full font-mono font-bold tracking-wider uppercase text-center sm:text-left"
              placeholder="e.g. A1B2-C3D4-E5F6-G7H8"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              maxLength={36}
              required
              autoFocus
              disabled={submitting}
            />
            <p className="mt-1.5 text-xs text-ink-soft">
              Joining by key grants view-only access. The subject owner can promote you to editor.
            </p>
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
            <button type="submit" className="btn btn-primary" disabled={submitting || !key.trim()}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              {submitting ? "Joining…" : "Join Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

