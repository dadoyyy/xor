"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Flame } from "lucide-react";
import { CORGI_ASSETS } from "@/lib/mascot/assets";

export type StreakData = {
  currentStreak: number;
  longestStreak: number;
  todayQualified: boolean;
  timezone: string;
};

export const STREAK_UPDATED_EVENT = "xor:streak-updated";

/** Updates the streak badge immediately across the shell without reloading or router.refresh() */
export function emitStreakUpdate(streak: Partial<StreakData>) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STREAK_UPDATED_EVENT, { detail: streak }));
  }
}

export default function StreakBadge({ streak: initialStreak }: { streak?: StreakData | null }) {
  const [streak, setStreak] = useState<StreakData | null>(initialStreak ?? null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (initialStreak) {
      setStreak(initialStreak);
    }
  }, [initialStreak]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<Partial<StreakData>>).detail;
      if (detail) {
        setStreak((prev) => ({
          currentStreak: detail.currentStreak ?? prev?.currentStreak ?? 0,
          longestStreak: detail.longestStreak ?? prev?.longestStreak ?? 0,
          todayQualified: detail.todayQualified ?? prev?.todayQualified ?? true,
          timezone: detail.timezone ?? prev?.timezone ?? "UTC",
        }));
      }
    };
    window.addEventListener(STREAK_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(STREAK_UPDATED_EVENT, handleUpdate);
  }, []);

  const count = streak?.currentStreak ?? 0;
  const isQualified = streak?.todayQualified ?? false;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-none ${
          isQualified
            ? "border-mint/40 bg-white text-[var(--shell-fg)] hover:border-mint"
            : count > 0
              ? "border-sun/50 bg-white text-[var(--shell-fg)] hover:border-sun"
              : "border-[rgba(43,27,90,0.12)] bg-white text-[var(--shell-fg)] hover:border-[var(--shell-accent)]/30 hover:bg-white/95"
        }`}
        aria-label={`Study streak: ${count} days`}
      >
        <Flame size={14} className="text-amber-500 fill-amber-500 shrink-0" />
        <span>
          {count} {count === 1 ? "day" : "days"}
        </span>
        {isQualified && <span className="size-1.5 rounded-full bg-mint" />}
      </button>

      {/* Tooltip / Popover */}
      {showTooltip && (
        <div
          role="tooltip"
          className="pop absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border-2 border-line bg-paper p-4 shadow-xl"
        >
          <div className="flex items-center gap-2.5 border-b-2 border-line/60 pb-3">
            <Image
              src={isQualified ? CORGI_ASSETS.proud.src : CORGI_ASSETS.thinking.src}
              alt="Corgi streak status"
              width={38}
              height={38}
              className="select-none object-contain motion-reduce:animate-none"
            />
            <div>
              <p className="font-display text-sm font-bold leading-tight">
                {isQualified ? "Streak Active Today!" : count > 0 ? "Keep Your Streak Alive!" : "Start a Study Streak"}
              </p>
              <p className="text-xs text-ink-soft">
                {isQualified ? "You studied today! Great work." : "Review 5 cards or take a quiz to qualify today."}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex justify-between font-semibold">
              <span className="text-ink-soft">Current Streak:</span>
              <span className="font-bold text-ink">
                {count} {count === 1 ? "day" : "days"}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-ink-soft">Best Streak:</span>
              <span className="font-bold text-ink">
                {streak?.longestStreak ?? count} {(streak?.longestStreak ?? count) === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
