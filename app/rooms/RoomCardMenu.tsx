"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFeedback } from "@/components/Feedback";
import RoomCover from "@/components/RoomCover";
import { COVERS, coverStyle, getCover } from "@/lib/covers";
import { Check, LogOut, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

type Room = { id: string; name: string; description: string | null; cover: string | null; role: string };

/** ⋯ button on a room card: Edit / Delete for owners, Leave for members. */
export default function RoomCardMenu({ room, meId, coversEnabled }: { room: Room; meId: string; coversEnabled: boolean }) {
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
    const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    if (!res.ok) return toast({ kind: "error", title: "Couldn't delete the room", body: (await res.json().catch(() => ({}))).error });
    toast({ title: "Room deleted" });
    router.refresh();
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
    const { error } = await createClient().rpc("remove_member", { p_room: room.id, p_user: meId });
    if (error) return toast({ kind: "error", title: "Couldn't leave the room", body: error.message });
    toast({ title: "You left the room" });
    router.refresh();
  }

  const item = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold";

  return (
    <div ref={ref} className="absolute right-3 top-3 sm:right-7 sm:top-7" style={{ zIndex: open ? 30 : 5 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Options for ${room.name}`}
        className="grid size-9 place-items-center rounded-full bg-white/90 text-ink shadow-[0_2px_0_var(--line)] backdrop-blur transition-colors hover:bg-white"
      >
        <MoreHorizontal size={20} />
      </button>

      {open && (
        <div role="menu" className="card pop absolute right-0 mt-2 w-48 p-1.5" style={{ zIndex: 6 }}>
          {isOwner ? (
            <>
              <button
                role="menuitem"
                className={`${item} hover:bg-lilac`}
                onClick={() => {
                  setOpen(false);
                  setEditing(true);
                }}
              >
                <Pencil size={16} /> Edit room
              </button>
              <button role="menuitem" className={`${item} text-coral hover:bg-coral-tint`} onClick={del}>
                <Trash2 size={16} /> Delete room
              </button>
            </>
          ) : (
            <button role="menuitem" className={`${item} text-coral hover:bg-coral-tint`} onClick={leave}>
              <LogOut size={16} /> Leave room
            </button>
          )}
        </div>
      )}

      {editing &&
        createPortal(<EditRoomDialog room={room} coversEnabled={coversEnabled} onClose={() => setEditing(false)} />, document.body)}
    </div>
  );
}

function EditRoomDialog({ room, coversEnabled, onClose }: { room: Room; coversEnabled: boolean; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [name, setName] = useState(room.name);
  const [desc, setDesc] = useState(room.description ?? "");
  const [cover, setCover] = useState(getCover(room.cover, room.id).id);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const args: Record<string, string> = { p_room: room.id, p_name: name, p_description: desc };
    if (coversEnabled) args.p_cover = cover;
    const { error } = await createClient().rpc("update_room", args);
    setBusy(false);
    if (error) return toast({ kind: "error", title: "Couldn't save the room", body: error.message });
    toast({ title: "Room updated" });
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 grid place-items-center overflow-y-auto p-4" style={{ zIndex: 70 }}>
      <div className="fixed inset-0" style={{ background: "rgba(43, 37, 69, 0.35)" }} onClick={() => !busy && onClose()} />
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-room-title"
        className="card pop relative my-auto w-full max-w-2xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="edit-room-title" className="text-xl font-semibold">
            Edit room
          </h2>
          <button type="button" className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-lilac" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* live preview + text fields */}
          <div className="grid content-start gap-4">
            <div className="card-flat overflow-hidden p-3">
              <RoomCover cover={cover} roomId={room.id} name={name || room.name} className="h-24" big />
              <p className="mt-3 truncate px-1 font-display text-lg font-semibold">{name || "Room name"}</p>
              <p className="truncate px-1 text-sm text-ink-soft">{desc || "No description"}</p>
            </div>
            <div>
              <label className="label" htmlFor="er-name">
                Name
              </label>
              <input id="er-name" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="er-desc">
                Description <span className="font-semibold text-ink-soft">(optional)</span>
              </label>
              <input id="er-desc" className="input" maxLength={280} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this room for?" />
            </div>
          </div>

          {/* cover picker */}
          <fieldset>
            <legend className="label">Card design</legend>
            {coversEnabled ? (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-3" role="radiogroup" aria-label="Card design">
                {COVERS.map((c) => {
                  const on = c.id === cover;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={c.label}
                      title={c.label}
                      onClick={() => setCover(c.id)}
                      className="group text-left"
                    >
                      <span
                        className="relative block h-14 rounded-xl transition-transform group-hover:-translate-y-0.5"
                        style={{
                          ...coverStyle(c),
                          outline: on ? "3px solid var(--grape)" : "2px solid var(--line)",
                          outlineOffset: on ? "2px" : "-2px",
                        }}
                      >
                        {on && (
                          <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-grape text-white">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className={`mt-1 block truncate text-xs font-bold ${on ? "text-grape" : "text-ink-soft"}`}>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl bg-sun-tint p-4 text-sm font-semibold">
                Card designs need a quick database update. Run <span className="font-display">supabase/migrations/002_room_covers.sql</span> in
                Supabase&apos;s SQL Editor, then refresh.
              </p>
            )}
          </fieldset>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
