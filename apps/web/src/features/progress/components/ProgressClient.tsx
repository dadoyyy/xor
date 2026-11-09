"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Flame,
  Trophy,
  CalendarCheck,
  GraduationCap,
  Sparkles,
  Info,
  BookOpen,
} from "lucide-react";
import { CORGI_ASSETS } from "@/lib/mascot/assets";
import HeatmapView from "./HeatmapView";
import BadgeGrid from "./BadgeGrid";
import RecentAttemptsList from "./RecentAttemptsList";
import type { ProgressData } from "@/services/progressService";

export default function ProgressClient({ data }: { data: ProgressData }) {
  const {
    timezone,
    currentStreak,
    longestStreak,
    thisWeekActiveDays,
    totalQuizzesCompleted,
    monthlyHeatmap,
    yearlyHeatmap,
    badges,
    recentAttempts,
    hasAnyData,
  } = data;

  // Zero-data empty state: new user with 0 activity
  if (!hasAnyData) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl text-ink">Your Learning Progress</h1>
          <p className="text-sm text-ink-soft mt-1">
            Track streaks, study heatmaps, quiz performances, and milestone achievements.
          </p>
        </div>

        <div className="card p-8 sm:p-12 text-center max-w-xl mx-auto flex flex-col items-center">
          <div className="relative size-32 mb-4">
            <Image
              src={CORGI_ASSETS["empty-state"].src}
              alt={CORGI_ASSETS["empty-state"].alt}
              fill
              className="object-contain"
              sizes="128px"
              priority
            />
          </div>
          <h2 className="font-display text-xl font-bold text-ink">Ready to Start Your Streak?</h2>
          <p className="text-sm text-ink-soft max-w-sm mt-2">
            You don&apos;t have any recorded study activity yet. Review flashcards or complete a quiz to light up your heatmap and earn badges!
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/subjects" className="btn btn-primary font-bold flex items-center gap-2">
              <BookOpen size={16} />
              <span>Explore Subjects</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header with Old Accounts Backfill Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl text-ink">Your Learning Progress</h1>
          <p className="text-sm text-ink-soft mt-1">
            Track study consistency, review milestones, and unlocked achievements in your timezone ({timezone}).
          </p>
        </div>

        {/* Backfilled streaks notice */}
        <div className="inline-flex items-center gap-2 rounded-xl border border-line bg-cream px-3.5 py-2 text-xs text-ink-soft self-start sm:self-auto max-w-md">
          <Info size={16} className="text-grape shrink-0" />
          <span>
            Streaks started counting on <strong>November 5, 2026</strong>. Historical quiz and material sessions are preserved.
          </span>
        </div>
      </div>

      {/* Stats Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Streak */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold">Current Streak</span>
            <div className="rounded-xl border border-line bg-lilac/30 p-2 text-coral">
              <Flame size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-extrabold text-ink">{currentStreak}</span>
            <span className="text-xs font-bold text-ink-soft">{currentStreak === 1 ? "day" : "days"}</span>
          </div>
          <span className="mt-1 text-[11px] text-ink-soft">
            {currentStreak > 0 ? "Keep the flame burning today!" : "Study today to ignite your streak."}
          </span>
        </div>

        {/* Longest Streak */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold">Longest Streak</span>
            <div className="rounded-xl border border-line bg-lilac/30 p-2 text-sun">
              <Trophy size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-extrabold text-ink">{longestStreak}</span>
            <span className="text-xs font-bold text-ink-soft">{longestStreak === 1 ? "day" : "days"}</span>
          </div>
          <span className="mt-1 text-[11px] text-ink-soft">Personal best study streak.</span>
        </div>

        {/* This-Week Active Days */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold">This Week Active</span>
            <div className="rounded-xl border border-line bg-lilac/30 p-2 text-grape">
              <CalendarCheck size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-extrabold text-ink">{thisWeekActiveDays}</span>
            <span className="text-xs font-bold text-ink-soft">/ 7 days</span>
          </div>
          <span className="mt-1 text-[11px] text-ink-soft">Active learning days past 7 days.</span>
        </div>

        {/* Total Quizzes Completed */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-semibold">Quizzes Completed</span>
            <div className="rounded-xl border border-line bg-lilac/30 p-2 text-emerald-600">
              <GraduationCap size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-extrabold text-ink">{totalQuizzesCompleted}</span>
            <span className="text-xs font-bold text-ink-soft">quizzes</span>
          </div>
          <span className="mt-1 text-[11px] text-ink-soft">All-time finished study quizzes.</span>
        </div>
      </div>

      {/* GitHub-style Heatmap */}
      <HeatmapView
        monthlyCells={monthlyHeatmap}
        yearlyCells={yearlyHeatmap}
        timezone={timezone}
      />

      {/* Badges Grid */}
      <BadgeGrid badges={badges} />

      {/* Recent Attempts */}
      <RecentAttemptsList attempts={recentAttempts} />
    </div>
  );
}

