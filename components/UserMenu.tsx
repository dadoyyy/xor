"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useNav } from "@/lib/useNav";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, LogOut, UserPen, Volume2, VolumeX } from "lucide-react";
import { SOUND_EVENT, setSoundEnabled, soundEnabled } from "@/lib/sound";

export default function UserMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { go, pending } = useNav();
  const [leaving, setLeaving] = useState(false);

  const [sound, setSound] = useState(true);
  useEffect(() => {
    const sync = () => setSound(soundEnabled());
    sync();
    window.addEventListener(SOUND_EVENT, sync);
    return () => window.removeEventListener(SOUND_EVENT, sync);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  async function logout() {
    setLeaving(true);
    await createClient().auth.signOut();
    go("/", { replace: true, refresh: true });
  }

  return (
    <div ref={ref} className="relative">
      <button className="btn btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="grid size-6 place-items-center rounded-full bg-sun text-xs font-bold text-ink">
          {username.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{username}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="card menu-in absolute right-0 mt-2 w-60 overflow-hidden p-1.5">
          <Link href="/onboarding" className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold hover:bg-grape-tint">
            <UserPen size={18} /> Change username
          </Link>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={sound}
            onClick={() => setSoundEnabled(!sound)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold hover:bg-grape-tint"
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span className="flex-1 whitespace-nowrap">Sound effects</span>
            <span
              aria-hidden
              className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
              style={{ background: sound ? "var(--grape)" : "var(--line)" }}
            >
              <span
                className="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all"
                style={{ left: sound ? "1.125rem" : "0.125rem" }}
              />
            </span>
          </button>
          <button onClick={logout} disabled={leaving || pending} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold hover:bg-lilac">
            {leaving || pending ? <span className="spinner" aria-hidden /> : <LogOut size={18} />} {leaving || pending ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
