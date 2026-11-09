"use client";

import { useEffect } from "react";
import TopBar from "./TopBar";
import GlobalSidebar from "./GlobalSidebar";
import type { StreakData } from "./StreakBadge";

export default function AppShell({
  username,
  streak,
  leading,
  children,
}: {
  username: string;
  streak?: StreakData | null;
  leading?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.title = "xor";
  }, []);
  return (
    <div
      className="relative flex h-screen lg:h-dvh w-full overflow-hidden text-[var(--shell-fg)] p-2 sm:p-3 lg:p-4 gap-2 sm:gap-3 lg:gap-4 flex-col md:flex-row select-none"
      style={{
        background: "var(--shell-bg, var(--shell-bg-fallback))",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Fixed full-screen noise layer to eliminate gradient banding across large screens */}
      <div
        className="shell-dither pointer-events-none fixed inset-0 z-0 opacity-35 mix-blend-overlay"
        aria-hidden="true"
      />

      {/* 1. Left Narrow Sidebar on Frame */}
      <GlobalSidebar username={username} streak={streak} />

      {/* 2. Main Area: TopBar on Frame + Rounded White Content Sheet */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0 min-h-0 h-full overflow-hidden">
        {/* TopBar on Frame */}
        <TopBar
          username={username}
          streak={streak}
          leading={leading}
        />

        {/* Sheet containment wrapper: 6px margin/padding on >=sm preserves footprint and prevents ring clipping */}
        <div className="flex-1 min-w-0 min-h-0 sm:p-1.5 flex flex-col overflow-hidden">
          {/* Large Rounded White Sheet: 1px border in --sheet-border + 6px zero-blur ring in --sheet-ring */}
          <main
            data-sheet="true"
            className="flex-1 min-w-0 min-h-0 bg-white text-ink rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col border border-[var(--sheet-border)] shadow-none sm:shadow-[0_0_0_6px_var(--sheet-ring)]"
          >
            <div className="flex-1 min-h-0 overflow-y-auto pb-24 md:pb-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
