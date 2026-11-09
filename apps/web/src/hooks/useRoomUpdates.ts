"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Section, Updates } from "@/types/room";

export type { Section, Updates };

export const SEEN_EVENT = "xor:seen";

/**
 * Counts of new things per section of a subject.
 * Refreshes on navigation, when a section is marked seen, on focus,
 * and every minute.
 */
export function useRoomUpdates(subjectId: string) {
  const path = usePathname();
  const [updates, setUpdates] = useState<Updates>({});

  const load = useCallback(async () => {
    const { data, error } = await createClient().rpc("subject_updates", { p_subject: subjectId });
    if (error || !Array.isArray(data)) return;
    const next: Updates = {};
    for (const row of data as { section: Section; count: number }[]) next[row.section] = Number(row.count) || 0;
    setUpdates(next);
  }, [subjectId]);

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

export const useSubjectUpdates = useRoomUpdates;
