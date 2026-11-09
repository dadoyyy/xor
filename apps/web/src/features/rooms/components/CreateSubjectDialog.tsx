"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { BookPlus, Loader2, Sparkles, X } from "lucide-react";
import { createNewSubject } from "../services/roomService";
import { useFeedback } from "@/components/ui/Feedback";

export default function CreateSubjectDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const id = await createNewSubject(name.trim(), description.trim() || null);
      toast({ title: `"${name.trim()}" created!`, body: "Opening your new workspace..." });
      onClose();
      router.push(`/subjects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create subject.");
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
        aria-labelledby="create-subject-title"
        className="pop relative w-full max-w-md rounded-xl border border-line bg-paper p-6 modal-box"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[10px] bg-grape-tint text-grape">
              <BookPlus size={20} />
            </span>
            <div>
              <h2 id="create-subject-title" className="font-display text-lg font-bold">
                Create a Subject
              </h2>
              <p className="text-xs text-ink-soft">Start a workspace for a class, module, or exam.</p>
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
            <label className="label mb-1.5 block" htmlFor="sub-name">
              Subject Name
            </label>
            <input
              id="sub-name"
              className="input w-full font-semibold"
              placeholder="e.g. Organic Chemistry II, AP US History"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              autoFocus
              disabled={submitting}
            />
          </div>

          <div>
            <label className="label mb-1.5 block" htmlFor="sub-desc">
              Description (Optional)
            </label>
            <textarea
              id="sub-desc"
              className="input w-full resize-none text-sm"
              rows={2}
              placeholder="Professor, term, or topic overview"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={280}
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
            <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim()}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {submitting ? "Creating…" : "Create Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

