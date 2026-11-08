"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import UserMenu from "@/components/layout/UserMenu";
import StreakBadge, { type StreakData } from "./StreakBadge";

export default function TopBar({
  username,
  streak,
}: {
  username: string;
  leading?: React.ReactNode;
  streak?: StreakData | null;
  onToggleMobile?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mount effect verification logging
  useEffect(() => {
    console.log("[xor:shell] TopBar mounted");
    return () => console.log("[xor:shell] TopBar UNMOUNTED");
  }, []);

  // Keyboard shortcut '/' to focus global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync initial query from URL search params if on /subjects
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search).get("search");
      if (sp) {
        setQuery(sp);
      }
    }
  }, [pathname]);

  const onQueryChange = (val: string) => {
    setQuery(val);
    window.dispatchEvent(new CustomEvent("xor:global-search", { detail: val }));
    if (pathname === "/subjects") {
      const url = val ? `/subjects?search=${encodeURIComponent(val)}` : "/subjects";
      window.history.replaceState(null, "", url);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathname !== "/subjects") {
      router.push(`/subjects?search=${encodeURIComponent(query.trim())}`);
    }
  };

  // Detect subject context from URL
  const subjectMatch = pathname.match(/^\/(?:subjects|rooms)\/([a-zA-Z0-9_-]+)/);
  const subjectId = subjectMatch ? subjectMatch[1] : null;

  // Derive human-readable page title when not in a subject
  let pageTitle = "Home";
  if (pathname.startsWith("/subjects")) pageTitle = "Subjects";
  else if (pathname.startsWith("/calendar")) pageTitle = "Academic Calendar";
  else if (pathname.startsWith("/progress")) pageTitle = "Your Progress";

  const subjectTabs = subjectId
    ? [
        {
          label: "MATERIALS",
          href: `/subjects/${subjectId}`,
          isActive: pathname === `/subjects/${subjectId}` || pathname === `/rooms/${subjectId}`,
        },
        {
          label: "FLASHCARDS",
          href: `/subjects/${subjectId}/flashcards`,
          isActive: pathname.startsWith(`/subjects/${subjectId}/flashcards`) || pathname.startsWith(`/rooms/${subjectId}/flashcards`),
        },
        {
          label: "QUIZZES",
          href: `/subjects/${subjectId}/quizzes`,
          isActive: pathname.startsWith(`/subjects/${subjectId}/quizzes`) || pathname.startsWith(`/rooms/${subjectId}/quizzes`),
        },
        {
          label: "LEADERBOARD",
          href: `/subjects/${subjectId}/leaderboard`,
          isActive: pathname.startsWith(`/subjects/${subjectId}/leaderboard`) || pathname.startsWith(`/rooms/${subjectId}/leaderboard`),
        },
        {
          label: "MEMBERS & INVITES",
          href: `/subjects/${subjectId}/sharing`,
          isActive:
            pathname.startsWith(`/subjects/${subjectId}/sharing`) ||
            pathname.startsWith(`/subjects/${subjectId}/members`) ||
            pathname.startsWith(`/rooms/${subjectId}/sharing`) ||
            pathname.startsWith(`/rooms/${subjectId}/members`),
        },
      ]
    : [];

  return (
    <header
      data-topbar="true"
      aria-label="Top navigation bar"
      className="flex h-14 sm:h-16 w-full shrink-0 items-center justify-between px-3 sm:px-4 text-white select-none z-30"
    >
      {/* Left: Back button in subject OR page title */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {subjectId ? (
          <Link
            href="/subjects"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/12 hover:bg-white/20 text-white text-xs font-bold transition active:scale-95"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </Link>
        ) : (
          <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-white truncate">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Center: Subject section tabs on the colored frame */}
      {subjectId && (
        <nav
          aria-label="Subject section tabs"
          className="hidden md:flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-1 px-2"
        >
          {subjectTabs.map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              className={`text-xs tracking-[0.06em] uppercase whitespace-nowrap transition-all pb-1 ${
                tab.isActive
                  ? "font-bold text-white border-b-2 border-white"
                  : "font-semibold text-white/70 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}

      {/* Right: Global Search on frame + Streak Badge + User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <form onSubmit={handleSearch} className="relative hidden sm:block">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search subjects... (/)"
            className="w-36 sm:w-48 lg:w-56 rounded-[10px] border border-white/15 bg-white/12 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/60 transition-all focus:bg-white/20 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </form>

        <div className="streak-frame-badge">
          <StreakBadge streak={streak} />
        </div>

        <UserMenu username={username} />
      </div>
    </header>
  );
}
