"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookPlus,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import { SceneMorning } from "./banner/SceneMorning";
import { SceneAfternoon } from "./banner/SceneAfternoon";
import { SceneNight } from "./banner/SceneNight";
import { DesktopSceneMorning } from "./banner/DesktopSceneMorning";
import { DesktopSceneAfternoon } from "./banner/DesktopSceneAfternoon";
import { DesktopSceneNight } from "./banner/DesktopSceneNight";
import { BANNER_CORGI_CONFIG } from "./banner/corgiConfig";
import { SCENE_COMPOSITION_CONFIG } from "./banner/sceneCompositionConfig";
import type { StreakSummary } from "@/types/subject";
import type { LastStudiedItem } from "./HomeClient";

export type BannerScene = "morning" | "afternoon" | "evening" | "night";

export interface HomeBannerProps {
  username: string;
  initialScene: BannerScene;
  initialGreeting: string;
  subtitle: string;
  mobileSubtitle?: string;
  streak: StreakSummary | null;
  lastStudied?: LastStudiedItem | null;
  onCreateSubject: () => void;
  onJoinSubject: () => void;
  onImportText: () => void;
  /** Dev-only scene override. If passed or present in ?scene=, forces that scene. */
  sceneOverride?: BannerScene | null;
}

interface BannerTokens {
  titleColor: string;
  subtitleColor: string;
  streakNumeralColor: string;
  streakLabelColor: string;
  bestChipClass: string;
  activeTodayChipClass: string;
  primaryBtnClass: string;
  secondaryBtnClass: string;
  accentBtnClass: string;
  ctaBtnClass: string;
  textBackdropGradient: string;
}

const TOKENS: Record<"day" | "night", BannerTokens> = {
  day: {
    titleColor: "text-[#2B1B5A]",
    subtitleColor: "text-[#4D3A74]",
    streakNumeralColor: "text-[#2B1B5A]",
    streakLabelColor: "text-[#5C4982]",
    bestChipClass: "bg-white/80 text-[#2B1B5A] border border-[#2B1B5A]/10",
    activeTodayChipClass: "bg-emerald-100 text-emerald-800 border border-emerald-300/60",
    primaryBtnClass: "btn btn-primary btn-sm flex items-center gap-1.5 shadow-none",
    secondaryBtnClass:
      "btn btn-secondary btn-sm flex items-center gap-1.5 !bg-white text-[#2B1B5A] border border-[#2B1B5A]/15 shadow-none transition hover:!bg-[#F3EEFC]",
    accentBtnClass:
      "btn btn-accent btn-sm flex items-center gap-1.5 shadow-none",
    ctaBtnClass:
      "btn btn-primary btn-sm sm:btn-md inline-flex items-center gap-1.5 pl-4 pr-3.5 text-white shadow-none",
    textBackdropGradient:
      "bg-gradient-to-r from-white/70 via-white/35 to-transparent",
  },
  night: {
    titleColor: "text-white",
    subtitleColor: "text-white/85",
    streakNumeralColor: "text-white",
    streakLabelColor: "text-white/80",
    bestChipClass: "bg-white/20 text-white border border-white/20",
    activeTodayChipClass: "bg-emerald-400/25 text-emerald-200 border border-emerald-400/40",
    primaryBtnClass:
      "btn btn-primary btn-sm flex items-center gap-1.5 bg-[#7C4DFF] text-white hover:bg-[#6A3DE8] shadow-none",
    secondaryBtnClass:
      "btn btn-secondary btn-sm flex items-center gap-1.5 !bg-white text-[#2B1B5A] border border-white/20 shadow-none transition hover:!bg-[#F3EEFC]",
    accentBtnClass:
      "btn btn-accent btn-sm flex items-center gap-1.5 bg-[#FFD54F] text-[#240F3E] hover:bg-[#FFCA28] shadow-none font-bold",
    ctaBtnClass:
      "btn btn-primary btn-sm sm:btn-md inline-flex items-center gap-1.5 pl-4 pr-3.5 bg-[#7C4DFF] text-white hover:bg-[#6A3DE8] shadow-none",
    textBackdropGradient:
      "bg-gradient-to-r from-[#140B38]/75 via-[#140B38]/40 to-transparent",
  },
};

export default function HomeBanner({
  username,
  initialScene,
  initialGreeting,
  subtitle,
  mobileSubtitle,
  streak,
  lastStudied,
  onCreateSubject,
  onJoinSubject,
  onImportText,
  sceneOverride,
}: HomeBannerProps) {
  const [currentScene, setCurrentScene] = useState<BannerScene>(
    sceneOverride ?? initialScene
  );
  const [greeting, setGreeting] = useState<string>(initialGreeting);
  const [, startTransition] = useTransition();

  // Normalize evening / night
  const normalizedScene =
    currentScene === "night" ? "evening" : currentScene;

  // Dev-only URL parameter override (?scene=morning|afternoon|evening|night)
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      const sp = new URLSearchParams(window.location.search);
      const urlScene = sp.get("scene") as BannerScene | null;
      if (
        urlScene &&
        (urlScene === "morning" ||
          urlScene === "afternoon" ||
          urlScene === "evening" ||
          urlScene === "night")
      ) {
        startTransition(() => {
          setCurrentScene(urlScene);
          if (urlScene === "morning") setGreeting("Good morning");
          else if (urlScene === "afternoon") setGreeting("Good afternoon");
          else setGreeting("Good evening");
        });
      }
    }
  }, []);

  // Window focus listener: crossfade if time boundary crossed while away
  useEffect(() => {
    const handleFocus = () => {
      if (sceneOverride) return;
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        const sp = new URLSearchParams(window.location.search);
        if (sp.has("scene")) return; // Honor dev override
      }

      const hour = new Date().getHours();
      let nextScene: BannerScene = "evening";
      let nextGreeting = "Good evening";

      if (hour >= 5 && hour < 12) {
        nextScene = "morning";
        nextGreeting = "Good morning";
      } else if (hour >= 12 && hour < 18) {
        nextScene = "afternoon";
        nextGreeting = "Good afternoon";
      }

      if (nextScene !== currentScene) {
        startTransition(() => {
          setCurrentScene(nextScene);
          setGreeting(nextGreeting);
        });
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [currentScene, sceneOverride]);

  const isNight = normalizedScene === "evening" || currentScene === "night";
  const tokens = isNight ? TOKENS.night : TOKENS.day;
  const corgi = BANNER_CORGI_CONFIG[normalizedScene];
  const desktopComposition = SCENE_COMPOSITION_CONFIG[normalizedScene];

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const todayQualified = streak?.todayQualified ?? false;

  const ctaHref = lastStudied
    ? `/subjects/${lastStudied.subjectId}/${lastStudied.kind === "quiz" ? "quizzes" : "flashcards"}/${lastStudied.id}`
    : "/subjects";

  return (
    <>
      {/* 1. DESKTOP & TABLET VIEWPORT (>= 768px): REARRANGED COMPOSITION */}
      <div
        data-home-hero="true"
        className="hidden md:flex @container relative w-full h-full min-h-[260px] md:h-[280px] max-h-[280px] overflow-hidden rounded-[20px] p-4 sm:p-5 lg:p-6 flex-col justify-between shadow-none select-none transition-colors duration-500"
        style={{
          backgroundColor: isNight ? "#140B38" : "#EFE9FF",
        }}
      >
        {/* 1. Vector SVG Background Scene (Inline SVG, preserveAspectRatio='xMaxYMax slice') */}
        <div className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-500 motion-reduce:transition-none">
          {normalizedScene === "morning" && (
            <DesktopSceneMorning className="w-full h-full object-cover" />
          )}
          {normalizedScene === "afternoon" && (
            <DesktopSceneAfternoon className="w-full h-full object-cover" />
          )}
          {isNight && (
            <DesktopSceneNight className="w-full h-full object-cover" />
          )}

          {/* Soft local contrast gradient behind the left text column only */}
          <div
            className={`absolute inset-y-0 left-0 w-full sm:w-[55%] lg:w-[45%] pointer-events-none ${tokens.textBackdropGradient}`}
          />
        </div>

        {/* 2. Top-Right CTA Pill Button (Moved to top-right corner, inset 16-20px) */}
        <div data-cta-button="true" className="absolute right-4 sm:right-6 top-3.5 sm:top-4 z-20">
          {lastStudied ? (
            <Link
              href={ctaHref}
              className={tokens.ctaBtnClass}
            >
              <span>Resume {lastStudied.kind === "quiz" ? "Quiz" : "Deck"}</span>
              <ChevronRight size={16} />
            </Link>
          ) : (
            <Link
              href="/subjects"
              className={tokens.ctaBtnClass}
            >
              <span>Start Studying</span>
              <ChevronRight size={16} />
            </Link>
          )}
        </div>

        {/* 3. Standing Corgi Layer (In the right-most corner on the flat front hill knoll) */}
        <div
          data-desktop-corgi="true"
          className="absolute pointer-events-none z-10 flex flex-col items-center corgi-float"
          style={{
            right: `${desktopComposition.corgi.rightPercent}%`,
            bottom: `${desktopComposition.corgi.bottomPx}px`,
            height: `${desktopComposition.corgi.heightPercent}%`,
          }}
          aria-hidden="true"
        >
          {/* Soft ground shadow ellipse */}
          <div
            className="absolute rounded-full"
            style={{
              width: `${desktopComposition.corgi.shadowWidthPercent}%`,
              height: `${desktopComposition.corgi.shadowHeightPx}px`,
              backgroundColor: desktopComposition.corgi.shadowColor,
              opacity: desktopComposition.corgi.shadowOpacity,
              bottom: `${desktopComposition.corgi.shadowBottomPx}px`,
              left: "50%",
              transform: "translateX(-50%)",
              filter: "blur(2.5px)",
            }}
          />
          {/* Standing Corgi Image (Facing toward camera/left into the card) */}
          <Image
            src={corgi.asset}
            alt=""
            width={corgi.intrinsicWidth}
            height={corgi.intrinsicHeight}
            className="relative z-10 h-full w-auto object-contain max-lg:scale-[0.78] max-lg:origin-bottom-right"
            priority
          />
        </div>

        {/* 4. Left Content Area: Greeting, Subtitle, Streak Numeral & Best Chip */}
        <div data-text-zone="true" className="relative z-10 max-w-[42%]">
          <h1
            className={`font-display text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight ${tokens.titleColor}`}
          >
            {greeting}, {username}!
          </h1>
          <p className={`mt-1 text-xs sm:text-sm line-clamp-1 ${tokens.subtitleColor}`}>
            {subtitle}
          </p>

          {/* Big streak numeral inside hero */}
          <div className="mt-2.5 sm:mt-3 flex items-baseline gap-2.5">
            <span
              className={`font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-none ${tokens.streakNumeralColor}`}
            >
              {currentStreak}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-xs sm:text-sm font-bold ${tokens.streakLabelColor}`}>
                {currentStreak === 1 ? "day streak" : "days streak"}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold shadow-none ${tokens.bestChipClass}`}
              >
                Best: {longestStreak} {longestStreak === 1 ? "day" : "days"}
              </span>
              {todayQualified && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-bold shadow-none ${tokens.activeTodayChipClass}`}
                >
                  Active today
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 5. Quick Action Buttons (Left button group, keeps position and styles) */}
        <div data-left-buttons="true" className="relative z-10 mt-2.5 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 max-w-[42%] w-fit">
          <button
            type="button"
            onClick={onCreateSubject}
            className={tokens.primaryBtnClass}
          >
            <BookPlus size={15} />
            <span>Create a Subject</span>
          </button>
          <button
            type="button"
            onClick={onJoinSubject}
            className={tokens.accentBtnClass}
          >
            <KeyRound size={15} />
            <span>Join with a Key</span>
          </button>
        </div>
      </div>

      {/* 2. PHONE ONLY VIEWPORT (< 768px, md:hidden): SPLIT ART BAND + BODY CARD */}
      <div
        data-home-hero-mobile="true"
        className="md:hidden relative w-full overflow-hidden rounded-[20px] border border-[var(--card-border)] flex flex-col shadow-none select-none bg-white"
      >
        {/* ART BAND (Top: 96px fixed height, time-of-day scene with right bottom crop, standing corgi) */}
        <div
          className="relative h-24 sm:h-[104px] w-full overflow-hidden shrink-0"
          style={{
            backgroundColor: isNight ? "#140B38" : "#EFE9FF",
          }}
        >
          {/* SVG Scene */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {normalizedScene === "morning" && (
              <SceneMorning className="w-full h-full object-cover object-right-bottom" />
            )}
            {normalizedScene === "afternoon" && (
              <SceneAfternoon className="w-full h-full object-cover object-right-bottom" />
            )}
            {isNight && (
              <SceneNight className="w-full h-full object-cover object-right-bottom" />
            )}
          </div>

          {/* Standing Corgi Layer */}
          <div
            className="absolute pointer-events-none z-10 flex flex-col items-center"
            style={{
              left: `${corgi.leftPercent}%`,
              bottom: `${corgi.bottomPx}px`,
              height: `${corgi.heightPercent}%`,
              transform: "translateX(-50%)",
            }}
            aria-hidden="true"
          >
            {/* Soft ground shadow ellipse */}
            <div
              className="absolute rounded-full"
              style={{
                width: `${corgi.shadowWidthPercent}%`,
                height: `${corgi.shadowHeightPx}px`,
                backgroundColor: corgi.shadowColor,
                opacity: corgi.shadowOpacity,
                bottom: `${corgi.shadowBottomPx}px`,
                left: "50%",
                transform: "translateX(-50%)",
                filter: "blur(2px)",
              }}
            />
            {/* Corgi character */}
            <Image
              src={corgi.asset}
              alt=""
              width={corgi.intrinsicWidth}
              height={corgi.intrinsicHeight}
              className="relative z-10 h-full w-auto object-contain"
              priority
            />
          </div>
        </div>

        {/* BODY (Below band: 14-16px padding, plain white surface) */}
        <div className="p-3.5 sm:p-4 bg-white flex flex-col">
          {/* Greeting: 20px, weight 700, leading 1.15, brand purple name */}
          <h1 className="font-display text-[clamp(18px,5vw,22px)] font-bold leading-[1.15] text-[#2B1B5A]">
            {greeting}, <span className="text-[#6D3BE8]">{username}</span>!
          </h1>

          {/* Subtitle: 13px truncated with ellipsis */}
          <p className="mt-1 text-[13px] text-ink-muted truncate">
            {mobileSubtitle || subtitle}
          </p>

          {/* Streak chips: 28px tall, tinted, wraps only if below 340px */}
          <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
            <span className="h-7 px-2.5 rounded-full bg-[#EFE9FF] text-[#5A2BC4] text-xs font-semibold inline-flex items-center shadow-none">
              {currentStreak} {currentStreak === 1 ? "day streak" : "days streak"}
            </span>
            <span className="h-7 px-2.5 rounded-full bg-[#EFE9FF] text-[#5A2BC4] text-xs font-semibold inline-flex items-center shadow-none">
              Best {longestStreak}
            </span>
            {todayQualified && (
              <span className="h-7 px-2.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center shadow-none">
                Active today
              </span>
            )}
          </div>

          {/* Primary CTA button: full width, 48px tall, pill radius, solid purple */}
          <div className="mt-3 sm:mt-3.5">
            <Link
              href={ctaHref}
              className="w-full h-12 rounded-full bg-[#6D3BE8] hover:bg-[#5A2BC4] text-white font-bold text-sm inline-flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-none"
            >
              <span>
                {lastStudied
                  ? `Resume ${lastStudied.kind === "quiz" ? "quiz" : "deck"}`
                  : "Start studying"}
              </span>
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
