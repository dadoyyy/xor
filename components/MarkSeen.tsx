"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SEEN_EVENT, type Section } from "@/lib/useRoomUpdates";

/** Put on a section page: records "I've seen this section now" and clears its badge. */
export default function MarkSeen({ roomId, section }: { roomId: string; section: Section }) {
  useEffect(() => {
    let cancelled = false;
    createClient()
      .rpc("mark_seen", { p_room: roomId, p_section: section })
      .then(() => {
        if (!cancelled) window.dispatchEvent(new Event(SEEN_EVENT));
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, section]);
  return null;
}
