"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, UserPen, Volume2, VolumeX } from "lucide-react";
import { useNav } from "@/hooks/useNav";
import { createClient } from "@/lib/supabase/client";
import { setSoundEnabled, SOUND_EVENT, soundEnabled } from "@/utils/sound";

const TZ_SYNC_KEY = "xor:synced_tz";

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

  // Automatically keep profiles.timezone synced with the user's browser IANA timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz) return;
      if (sessionStorage.getItem(TZ_SYNC_KEY) === tz) return;
      sessionStorage.setItem(TZ_SYNC_KEY, tz);
      void fetch("/api/profile/timezone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: tz }),
      }).catch(() => {});
    } catch {
      // ignore storage/Intl errors in restricted browsers
    }
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
      <button
        className="btn btn-sm rounded-full bg-white hover:bg-white/95 border border-[rgba(43,27,90,0.12)] text-[var(--shell-fg)] transition hover:border-[var(--shell-accent)]/30 active:scale-95 shadow-none"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="grid size-6 place-items-center rounded-full bg-sun text-xs font-bold text-[#2B1B5A]">
          {username.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline text-[var(--shell-fg)] font-bold">{username}</span>
        <ChevronDown size={14} className="text-[var(--shell-muted)]" />
      </button>
      {open && (
        <div className="card menu-in absolute right-0 mt-2 w-60 overflow-hidden p-2 bg-white text-ink border border-line rounded-[16px] shadow-xl z-50">
          <Link href="/onboarding" className="flex items-center gap-2 rounded-[10px] px-3.5 py-2 font-semibold hover:bg-grape-tint">
            <UserPen size={18} /> Change username
          </Link>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={sound}
            onClick={() => setSoundEnabled(!sound)}
            className="flex w-full items-center gap-2 rounded-[10px] px-3.5 py-2 text-left font-semibold hover:bg-grape-tint"
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
          <button onClick={logout} disabled={leaving || pending} className="flex w-full items-center gap-2 rounded-[10px] px-3.5 py-2 text-left font-semibold hover:bg-lilac">
            {leaving || pending ? <span className="spinner" aria-hidden /> : <LogOut size={18} />} {leaving || pending ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
