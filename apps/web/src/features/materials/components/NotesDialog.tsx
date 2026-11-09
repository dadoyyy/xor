"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import Markdown from "@/components/ui/Markdown";
import { BookOpen, X } from "lucide-react";

/**
 * Reader for a PDF's AI notes.
 * Phones: full-screen sheet. Larger screens: centered card.
 * Rendered on <body> so nothing on the page can squeeze or offset it.
 */
export default function NotesDialog({ title, content, onClose }: { title: string; content: string | null; onClose: () => void }) {
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

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="notes-wrap fixed inset-0 flex items-stretch justify-center sm:items-center sm:p-6" style={{ zIndex: 70 }}>
      <div className="fade-in absolute inset-0" style={{ background: "rgba(43, 37, 69, 0.4)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-title"
        className="notes-sheet pop relative flex w-full min-w-0 flex-col bg-white sm:max-w-3xl sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b-2 border-line px-4 py-3 sm:px-6 sm:py-4">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-grape-tint text-grape">
            <BookOpen size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Notes</p>
            <h2 id="notes-title" className="font-display text-base font-semibold leading-snug sm:text-lg" style={{ overflowWrap: "anywhere" }}>
              {title}
            </h2>
          </div>
          <button type="button" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-lilac" onClick={onClose} aria-label="Close notes">
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-4 sm:px-6 sm:pb-6">
          <p className="mb-4 rounded-xl bg-lilac px-3 py-2 text-xs font-semibold text-ink-soft">
            These are the notes the AI read from your PDF. Quizzes and flashcards come from these.
          </p>
          {content === null ? (
            <div className="grid gap-3" aria-label="Loading notes">
              <div className="skeleton h-7 w-2/3 rounded-lg" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-11/12 rounded" />
              <div className="skeleton h-4 w-4/5 rounded" />
              <div className="skeleton mt-3 h-6 w-1/2 rounded-lg" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          ) : content.trim() ? (
            <Markdown text={content} />
          ) : (
            <p className="text-sm text-ink-soft">No notes were saved for this PDF.</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

