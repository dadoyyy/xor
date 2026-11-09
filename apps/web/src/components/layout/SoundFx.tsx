"use client";
import { useEffect } from "react";
import { play, unlockAudio } from "@/utils/sound";

/**
 * A soft click for every button, tab and link card, app-wide.
 * Anything with its own sound (flip, answer pick…) opts out with data-sfx="none".
 */
export default function SoundFx() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      unlockAudio();
      if (e.button !== 0) return;
      const el = (e.target as Element | null)?.closest?.('button, a, [role="tab"], [role="radio"], label');
      if (!el || el.closest('[data-sfx="none"]')) return;
      if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
      const clickable =
        el.matches(".btn, .chip, .card-link, [role='tab'], [role='menuitem'], [role='radio']") ||
        el.closest(".card-link, [role='menu']") ||
        (el.tagName === "BUTTON" && !el.closest("form textarea"));
      if (clickable) play("tap");
    };
    const onKey = () => unlockAudio();
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, { once: true });
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}

