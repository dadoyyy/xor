"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Section = "materials" | "flashcards" | "quizzes" | "leaderboard" | "members";
export type Updates = Partial<Record<Section, number>>;

export const SEEN_EVENT = "xor:seen";

/**
 * Counts of new things per section of a room (needs migration 003).
 * Refreshes on navigation, when a section is marked seen, on focus,
 * and every minute. If the migration isn't installed, returns {}.
 */
export function useRoomUpdates(roomId: string) {
  const path = usePathname();
  const [updates, setUpdates] = useState<Updates>({});

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("room_updates", { p_room: roomId });
    if (error || !Array.isArray(data)) return;
    const next: Updates = {};
    for (const row of data as { section: Section; count: number }[]) next[row.section] = Number(row.count) || 0;
    setUpdates(next);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load, path]);

  useEffect(() => {
    const onSeen = () => load();
    const onFocus = () => document.visibilityState === "visible" && load();
    window.addEventListener(SEEN_EVENT, onSeen);
    document.addEventListener("visibilitychange", onFocus);
    const t = setInterval(onFocus, 60_000);
    return () => {
      window.removeEventListener(SEEN_EVENT, onSeen);
      document.removeEventListener("visibilitychange", onFocus);
      clearInterval(t);
    };
  }, [load]);

  return updates;
}
