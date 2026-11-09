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
  username?: string;
  streak?: StreakData | null;
}) {
  const pathname = usePathname();
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Mount effect verification logging - ensures persistent layout doesn't remount
  useEffect(() => {
    console.log("[xor:shell] GlobalSidebar mounted");
    return () => console.log("[xor:shell] GlobalSidebar UNMOUNTED");
  }, []);

  // Sync optimistic path when real pathname finishes updating
  useEffect(() => {
    setOptimisticPath(null);
    document.title = "xor";
  }, [pathname]);

  // Mobile keyboard detection: hide floating bottom bar when typing in inputs/textareas
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setIsKeyboardOpen(false);
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

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

  const activeIndex = navItems.findIndex((item) => item.isActive);

  return (
    <>
      {/* 1. Desktop & Tablet: Floating Pill-Shaped Capsule Sidebar (>= 768px) */}
      <aside
        data-sidebar="true"
        aria-label="App Sidebar"
        className="hidden md:flex flex-col items-center w-[84px] shrink-0 py-2 sm:py-3 select-none z-20"
      >
        {/* Top Brand Logo - OUTSIDE the capsule */}
        <div className="flex flex-col items-center shrink-0 pt-1">
          <Link
            href="/home"
            className="flex flex-col items-center group transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-accent)] rounded-full"
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
                unoptimized
              />
            </div>
            <span className="font-display text-sm font-bold tracking-tight text-[var(--shell-fg)] mt-0.5">
              xor
            </span>
          </Link>
        </div>

        {/* Floating Capsule Container: Centered vertically in sidebar space below logo */}
        <div className="my-auto flex flex-col items-center">
          <nav
            aria-label="Main"
            className="relative nav-capsule nav-capsule-desktop w-[80px] px-2 py-3 flex flex-col items-center gap-2 select-none overflow-hidden"
          >
            {/* Smooth animated sliding circle indicator */}
            <div
              data-indicator="desktop"
              className="pointer-events-none absolute rounded-full bg-[var(--nav-active-bg)] z-0 shadow-sm"
              style={{
                width: "var(--nav-indicator-size, 64px)",
                height: "var(--nav-indicator-size, 64px)",
                top: "var(--nav-indicator-top, 12px)",
                left: "var(--nav-indicator-left, 8px)",
                transform:
                  activeIndex >= 0
                    ? `translateY(calc(${activeIndex} * var(--nav-indicator-step, 72px)))`
                    : "translateY(0px)",
                opacity: activeIndex >= 0 ? 1 : 0,
                transition:
                  "transform 0.32s cubic-bezier(0.34, 1.45, 0.64, 1), opacity 0.2s ease",
              }}
              aria-hidden="true"
            />

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setOptimisticPath(item.href)}
                  aria-current={item.isActive ? "page" : undefined}
                  className={`size-[64px] nav-item-desktop rounded-full flex flex-col items-center justify-center gap-[3px] select-none active:scale-[0.97] cursor-pointer relative z-10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-active-bg)] focus-visible:ring-offset-2 ${
                    item.isActive
                      ? "text-white"
                      : "bg-transparent text-[var(--nav-inactive)] hover:bg-[#EFE9FF]/60 hover:text-[#5A2BC4]"
                  }`}
                >
                  <Icon
                    size={21}
                    className={`shrink-0 transition-colors duration-200 ${
                      item.isActive
                        ? "text-white stroke-[2.2]"
                        : "fill-none text-[var(--nav-inactive)] stroke-[1.75]"
                    }`}
                  />
                  <span
                    className={`text-[10.5px] leading-[1.1] text-center whitespace-nowrap tracking-normal transition-colors duration-200 ${
                      item.isActive
                        ? "font-bold text-white"
                        : "font-semibold text-[var(--nav-inactive)] group-hover:text-[#5A2BC4]"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* 2. Phone (< 768px): Floating Bottom Bar Horizontal Capsule */}
      <nav
        aria-label="Main"
        className={`md:hidden fixed z-40 inset-x-3 max-w-md mx-auto h-[60px] nav-capsule px-2 py-1.5 flex items-center justify-between gap-1.5 transition-all duration-150 ${
          isKeyboardOpen ? "translate-y-28 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
        }`}
        style={{
          bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={() => setOptimisticPath(item.href)}
              aria-current={item.isActive ? "page" : undefined}
              className={`flex-1 min-h-[44px] h-12 nav-item-mobile rounded-[18px] flex flex-col items-center justify-center gap-[2px] active:scale-[0.97] select-none text-center cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-active-bg)] focus-visible:ring-offset-2 ${
                item.isActive
                  ? "bg-[var(--nav-active-bg)] text-white shadow-sm"
                  : "bg-transparent text-[var(--nav-inactive)] hover:bg-[#EFE9FF]/60 hover:text-[#5A2BC4]"
              }`}
            >
              <Icon
                size={20}
                className={`shrink-0 transition-colors duration-200 ${
                  item.isActive
                    ? "text-white stroke-[2.2]"
                    : "fill-none text-[var(--nav-inactive)] stroke-[1.75]"
                }`}
              />
              <span
                className={`text-[11px] leading-[1.1] text-center whitespace-nowrap tracking-normal transition-colors duration-200 ${
                  item.isActive
                    ? "font-bold text-white"
                    : "font-semibold text-[var(--nav-inactive)]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
