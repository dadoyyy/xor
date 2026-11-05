"use client";
import { useLinkStatus } from "next/link";

/**
 * Put inside a <Link>. Shows a small spinner the moment the link is clicked,
 * until the next page is ready. Always rendered (fixed size) so nothing jumps.
 */
export default function LinkSpinner({ className = "" }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`spinner ${className}`}
      style={{ opacity: pending ? 1 : 0, transition: "opacity 0.15s ease", animationPlayState: pending ? "running" : "paused" }}
    />
  );
}
