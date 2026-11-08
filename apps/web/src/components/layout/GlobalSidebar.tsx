"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  Calendar,
  Home,
  TrendingUp,
} from "lucide-react";
import { CORGI_ASSETS } from "@/lib/mascot/assets";
import type { StreakData } from "./StreakBadge";

export default function GlobalSidebar({
  username = "Student",
  streak,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  username?: string;
  streak?: StreakData | null;
}) {
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

  // Mount effect verification logging
  useEffect(() => {
    console.log("[xor:shell] GlobalSidebar mounted");
    return () => console.log("[xor:shell] GlobalSidebar UNMOUNTED");
  }, []);

  // Sync optimistic path when real pathname finishes updating
  useEffect(() => {
    setOptimisticPath(null);
  }, [pathname]);

  const activePath = optimisticPath ?? pathname;
  const isHome = activePath === "/home";
  const isSubjects = activePath.startsWith("/subjects") || activePath.startsWith("/rooms");
  const isCalendar = activePath.startsWith("/calendar");
  const isProgress = activePath.startsWith("/progress");

  const navItems = [
    {
      label: "Home",
      href: "/home",
      icon: Home,
      isActive: isHome,
    },
    {
      label: "Subjects",
      href: "/subjects",
      icon: BookMarked,
      isActive: isSubjects,
    },
    {
      label: "Calendar",
      href: "/calendar",
      icon: Calendar,
      isActive: isCalendar,
    },
    {
      label: "Progress",
      href: "/progress",
      icon: TrendingUp,
      isActive: isProgress,
    },
  ];

  return (
    <>
      {/* 1. Desktop & Tablet: Narrow Sidebar Directly on Deep Purple Frame */}
      <aside
        data-sidebar="true"
        aria-label="App Sidebar"
        className="hidden md:flex flex-col justify-between items-center w-[84px] lg:w-[88px] shrink-0 py-3 sm:py-4 select-none"
      >
        {/* Top Brand Logo */}
        <div className="flex flex-col items-center gap-1">
          <Link
            href="/home"
            className="flex flex-col items-center group transition active:scale-95"
            aria-label="xor home"
          >
            <div className="relative size-10 shrink-0">
              <Image
                src={CORGI_ASSETS["logo-icon"].src}
                alt="xor logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <span className="font-display text-sm font-bold tracking-tight text-white mt-1">
              xor
            </span>
          </Link>
        </div>

        {/* 4 Navigation Buttons: Icon-over-label, active state is a 48px white circle */}
        <nav
          aria-label="Main Navigation"
          className="flex flex-col items-center gap-5 my-auto w-full px-2"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOptimisticPath(item.href)}
                aria-current={item.isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center transition-all duration-150 group active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-xl ${
                  item.isActive ? "text-white" : "text-white/70 hover:text-white"
                }`}
              >
                {item.isActive ? (
                  <div className="size-12 rounded-full bg-white text-[#5223BD] flex items-center justify-center shadow-none transition-transform group-hover:scale-105">
                    <Icon size={22} className="stroke-[2.5]" />
                  </div>
                ) : (
                  <div className="size-12 rounded-full flex items-center justify-center transition-colors group-hover:bg-white/10">
                    <Icon size={22} className="stroke-[2]" />
                  </div>
                )}
                <span className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.06em] mt-1 text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Spacer / Clean indicator */}
        <div className="flex flex-col items-center text-white/50 text-[10px] font-bold">
          <span>xor</span>
        </div>
      </aside>

      {/* 2. Mobile Bottom Bar: 56px Tall on Frame (<768px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-[#5223BD] border-t border-white/10 flex items-center justify-around px-2 pb-safe"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOptimisticPath(item.href)}
              aria-current={item.isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition ${
                item.isActive ? "text-white" : "text-white/70 hover:text-white"
              }`}
            >
              {item.isActive ? (
                <div className="size-8 rounded-full bg-white text-[#5223BD] flex items-center justify-center">
                  <Icon size={18} className="stroke-[2.5]" />
                </div>
              ) : (
                <div className="size-8 flex items-center justify-center">
                  <Icon size={18} className="stroke-[2]" />
                </div>
              )}
              <span className="text-[9px] font-bold uppercase tracking-[0.05em] mt-0.5 leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
