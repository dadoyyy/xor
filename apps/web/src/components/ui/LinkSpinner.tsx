"use client";
import { useLinkStatus } from "next/link";
import { createPortal } from "react-dom";
import CorgiLoader from "@/components/mascot/CorgiLoader";

/**
 * Put inside a <Link> (e.g. a room card on the dashboard).
 * Shows the full-screen <CorgiLoader /> loading state screen the moment the room is clicked
 * until the destination room page is ready.
 */
export default function LinkSpinner({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span
        aria-hidden
        className={`spinner ${className}`}
        style={{
          opacity: pending ? 1 : 0,
          transition: "opacity 0.15s ease",
          animationPlayState: pending ? "running" : "paused",
        }}
      />
      {pending &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fade-in fixed inset-0 z-50 flex min-h-dvh w-full items-center justify-center bg-lilac px-4 py-12">
            <CorgiLoader variant="default" size={140} />
          </div>,
          document.body,
        )}
    </>
  );
}
