"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, LogOut, MoreHorizontal, Palette, Pencil, Trash2 } from "lucide-react";
import { useFeedback } from "@/components/ui/Feedback";
import { deleteRoomById, leaveRoomById } from "../services/roomService";
import type { RoomSummary } from "../types";
import EditSubjectModal from "@/features/subjects/components/EditSubjectModal";

/** ⋯ button on a room card. Everyone can change their own card design; owners can also edit/delete, members can leave. */
export default function RoomCardMenu({
  room,
  meId,
  coversEnabled,
  className = "relative",
}: {
  room: RoomSummary;
  meId: string;
  coversEnabled: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { confirm, toast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isOwner = room.role === "owner";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function del() {
    setOpen(false);
    const ok = await confirm({
      title: `Delete "${room.name}"?`,
      body: "This deletes the room, its files, quizzes and leaderboards for everyone. It can't be undone.",
      confirmLabel: "Delete room",
      danger: true,
      typeToConfirm: room.name,
    });
    if (!ok) return;
    try {
      await deleteRoomById(room.id);
      toast({ title: "Room deleted" });
      router.refresh();
    } catch (err) {
      toast({ kind: "error", title: "Couldn't delete the room", body: err instanceof Error ? err.message : undefined });
    }
  }

  async function leave() {
    setOpen(false);
    const ok = await confirm({
      title: `Leave "${room.name}"?`,
      body: "You'll need the secret key to come back. Your scores stay on the leaderboard.",
      confirmLabel: "Leave room",
      danger: true,
    });
    if (!ok) return;
    try {
      await leaveRoomById(room.id, meId);
      toast({ title: "You left the room" });
      router.refresh();
    } catch (err) {
      toast({ kind: "error", title: "Couldn't leave the room", body: err instanceof Error ? err.message : undefined });
    }
  }

  const item = "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm font-semibold";

  return (
    <div ref={ref} className={className} style={{ zIndex: open ? 30 : 5 }}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Options for ${room.name}`}
        className="grid size-8 place-items-center rounded-full border border-line bg-white/90 text-ink shadow-xs transition-colors hover:bg-white"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div role="menu" className="card dropdown-box menu-in absolute right-0 mt-2 w-48 p-1.5 shadow-lg bg-paper" style={{ zIndex: 6 }}>
          <button
            role="menuitem"
            className={`${item} hover:bg-lilac`}
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
          >
            {isOwner ? <Pencil size={16} /> : <Palette size={16} />} {isOwner ? "Edit subject" : "Change design"}
          </button>
          {isOwner ? (
            <button role="menuitem" className={`${item} text-coral hover:bg-coral-tint`} onClick={del}>
              <Trash2 size={16} /> Delete subject
            </button>
          ) : (
            <button role="menuitem" className={`${item} text-coral hover:bg-coral-tint`} onClick={leave}>
              <LogOut size={16} /> Leave subject
            </button>
          )}
        </div>
      )}

      {editing &&
        createPortal(
          <EditSubjectModal
            room={room}
            coversEnabled={coversEnabled}
            onClose={() => setEditing(false)}
          />,
          document.body
        )}
    </div>
  );
}

