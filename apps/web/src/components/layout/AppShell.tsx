"use client";

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
  return (
    <div className="flex h-screen lg:h-dvh w-full overflow-hidden bg-[#5223BD] text-white p-2 sm:p-3 lg:p-4 gap-2 sm:gap-3 lg:gap-4 flex-col md:flex-row select-none">
      {/* 1. Left Narrow Sidebar on Deep Purple Frame */}
      <GlobalSidebar username={username} streak={streak} />

      {/* 2. Main Area: TopBar on Frame + Rounded White Content Sheet */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0 h-full overflow-hidden">
        {/* TopBar on Frame */}
        <TopBar
          username={username}
          streak={streak}
          leading={leading}
        />

        {/* Large Rounded White Sheet */}
        <main
          data-sheet="true"
          className="flex-1 min-w-0 min-h-0 bg-white text-ink rounded-t-[28px] md:rounded-[28px] overflow-hidden flex flex-col shadow-none"
        >
          <div className="flex-1 min-h-0 overflow-y-auto pb-16 md:pb-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
