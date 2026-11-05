"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, LogOut, UserPen } from "lucide-react";

export default function UserMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/");
    router.refresh();
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
        <div className="card menu-in absolute right-0 mt-2 w-52 overflow-hidden p-1.5">
          <Link href="/onboarding" className="flex items-center gap-2 rounded-xl px-3 py-2 font-semibold hover:bg-grape-tint">
            <UserPen size={18} /> Change username
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-semibold hover:bg-lilac">
            <LogOut size={18} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
