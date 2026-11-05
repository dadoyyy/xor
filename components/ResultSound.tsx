"use client";
import { useEffect } from "react";
import { play } from "@/lib/sound";

/** Plays a little fanfare once when you land on fresh quiz results. */
export default function ResultSound({ attemptId, pct, submittedAt }: { attemptId: string; pct: number; submittedAt: string | null }) {
  useEffect(() => {
    if (!submittedAt || Date.now() - new Date(submittedAt).getTime() > 5 * 60_000) return; // only right after submitting
    const key = `xor-result-sound-${attemptId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    const t = setTimeout(() => play(pct >= 75 ? "resultGreat" : pct >= 40 ? "resultGood" : "resultOk"), 250);
    return () => clearTimeout(t);
  }, [attemptId, pct, submittedAt]);
  return null;
}
