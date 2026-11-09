"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookPlus,
  KeyRound,
  FileText,
  Calendar as CalendarIcon,
  Flame,
  ArrowRight,
  Plus,
  ChevronRight,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { CORGI_ASSETS } from "@/lib/mascot/assets";
import Mascot from "@/components/ui/Mascot";
import CreateSubjectDialog from "@/features/rooms/components/CreateSubjectDialog";
import JoinSubjectDialog from "@/features/rooms/components/JoinSubjectDialog";
import TextImportDialog from "@/features/materials/components/TextImportDialog";
import HomeBanner, { type BannerScene } from "./HomeBanner";
import type { LibrarySubjectItem } from "@/features/rooms/components/LibraryClient";
import type { CalendarEvent, StreakSummary } from "@/types/subject";

export type WeekDayActivity = {
  dayName: string; // "Mon", "Tue", etc.
  dayNum: number;
  dateStr: string; // "YYYY-MM-DD"
  isToday: boolean;
  isFuture: boolean;
  qualified: boolean;
};

export type LastStudiedItem = {
  kind: "quiz" | "deck";
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
};

export type HeatmapItem = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3;
};

function formatRelativeDue(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  const d = new Date(dateStr + "T00:00:00Z");
  const now = new Date(today + "T00:00:00Z");
  const diffDays = Math.round((d.getTime() - now.getTime()) / (86400 * 1000));
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0) return "Overdue";
  return dateStr.slice(5); // "MM-DD"
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeClient({
  username,
  streak,
  subjects,
  lastStudied,
  thisWeek,
  upcomingEvents,
  heatmap,
  initialScene = "morning",
  initialGreeting = "Good morning",
  sceneOverride,
}: {
  username: string;
  streak: StreakSummary | null;
  subjects: LibrarySubjectItem[];
  lastStudied?: LastStudiedItem | null;
  thisWeek?: WeekDayActivity[] | null;
  upcomingEvents?: CalendarEvent[] | null;
  heatmap?: HeatmapItem[] | null;
  initialScene?: BannerScene;
  initialGreeting?: string;
  sceneOverride?: BannerScene | null;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showImportSelector, setShowImportSelector] = useState(false);
  const [selectedSubjectForImport, setSelectedSubjectForImport] = useState<string | null>(null);

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const todayQualified = streak?.todayQualified ?? false;

  const greeting = `${getTimeOfDayGreeting()}, ${username}!`;

  const nextEvent = upcomingEvents && upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  const headerSubtitle = nextEvent
    ? `Next deadline: ${nextEvent.title} (${nextEvent.due_date ? formatRelativeDue(nextEvent.due_date) : "soon"})`
    : currentStreak > 0
      ? `Keep your ${currentStreak}-day study streak going with a quick review today.`
      : "Ready for today's study session? Practice flashcards or take a quiz to begin.";

  const mobileSubtitle = nextEvent
    ? `Deadline: ${nextEvent.title} (${nextEvent.due_date ? formatRelativeDue(nextEvent.due_date) : "soon"})`
    : currentStreak > 0
      ? `Keep your ${currentStreak}-day streak going today.`
      : "Ready to study? Pick up where you left off.";

  function handleImportClick() {
    if (subjects.length === 0) {
      setShowCreate(true);
    } else if (subjects.length === 1) {
      setSelectedSubjectForImport(subjects[0].id);
    } else {
      setShowImportSelector(true);
    }
  }

  // Count active days this week
  const activeDaysThisWeek = (thisWeek ?? []).filter((d) => d.qualified).length;

  // Slice heatmap to last 12 weeks (84 days)
  const twelveWeekHeatmap = heatmap && heatmap.length > 84 ? heatmap.slice(-84) : heatmap ?? [];

  return (
    <div className="flex flex-col h-full max-md:h-auto gap-3 sm:gap-4 p-3 sm:p-5 lg:p-6 max-md:px-4 max-md:py-3 overflow-y-auto max-md:overflow-visible lg:overflow-hidden min-h-0">
      {/* 1. TOP ROW: Hero Card (col-span-8) + Upcoming Deadlines Pastel Accent Card (col-span-4) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 shrink-0 md:h-[280px] lg:h-[280px]">
        {/* Left Hero Card: HomeBanner with scenic illustration & mascot */}
        <div className="lg:col-span-8 h-full">
          <HomeBanner
            username={username}
            initialScene={initialScene}
            initialGreeting={initialGreeting}
            subtitle={headerSubtitle}
            mobileSubtitle={mobileSubtitle}
            streak={streak}
            lastStudied={lastStudied}
            onCreateSubject={() => setShowCreate(true)}
            onJoinSubject={() => setShowJoin(true)}
            onImportText={handleImportClick}
            sceneOverride={sceneOverride}
          />

          {/* Mobile Quick Action Tiles (Phone only: md:hidden) */}
          <div className="grid grid-cols-2 gap-2 md:hidden mt-3">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              aria-label="Create a Subject"
              className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-[16px] min-h-[72px] min-w-[44px] bg-[#F7F5FF] border border-[var(--card-border)] text-ink transition active:scale-[0.97] hover:bg-[#EFE9FF] shadow-none"
            >
              <BookPlus size={22} className="text-[#6D3BE8] shrink-0" />
              <span className="text-[11px] min-[360px]:text-xs font-semibold leading-tight text-center">
                New subject
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowJoin(true)}
              aria-label="Join with a Key"
              className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-[16px] min-h-[72px] min-w-[44px] bg-[#F7F5FF] border border-[var(--card-border)] text-ink transition active:scale-[0.97] hover:bg-[#EFE9FF] shadow-none"
            >
              <KeyRound size={22} className="text-[#6D3BE8] shrink-0" />
              <span className="text-[11px] min-[360px]:text-xs font-semibold leading-tight text-center">
                Join key
              </span>
            </button>
          </div>
        </div>

        {/* Right Accent Card: Upcoming Deadlines (Cream-Gold variant: #FFFBF0 surface, 1px #F2D675 border, radius 20px) */}
        <div
          data-surface="cream"
          className="card-cream-gold p-5 sm:p-6 lg:col-span-4 flex flex-col justify-between shadow-none select-none"
        >
          <div className="flex items-center justify-between border-b border-[var(--card-cream-divider)] pb-2.5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-[8px] bg-[var(--card-cream-accent-soft)] flex items-center justify-center shrink-0 text-[#2B1B5A]">
                <CalendarIcon size={16} />
              </div>
              <h2 className="font-display text-sm sm:text-base font-semibold text-[#2B1B5A]">
                Upcoming Deadlines
              </h2>
            </div>
            <Link
              href="/calendar"
              className="text-xs font-bold text-[var(--link-on-cream)] hover:underline flex items-center gap-0.5"
            >
              <span>View Calendar</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {!upcomingEvents || upcomingEvents.length === 0 ? (
            /* Empty state: Corgi inside a soft halo with yellow action button */
            <div className="py-3 flex flex-col items-center justify-center text-center my-auto">
              <div className="mb-2 shrink-0">
                <Mascot name="thinking" size="sm" alt="Academic calendar mascot" />
              </div>
              <p className="text-xs text-[var(--card-cream-text-muted)] mb-2.5">
                No upcoming deadlines on your academic calendar.
              </p>
              <Link
                href="/calendar"
                className="btn btn-sm inline-flex items-center justify-center gap-1.5 bg-[var(--card-cream-accent)] hover:bg-[var(--card-cream-accent-hover)] px-4 font-display text-xs font-bold text-[#2B1B5A] shadow-none transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--link-on-cream)]"
              >
                <Plus size={14} />
                <span>Add deadline</span>
              </Link>
            </div>
          ) : (
            /* List of up to 3 upcoming events with colored dots by type */
            <div className="space-y-2 py-2 overflow-y-auto min-h-0 my-auto">
              {upcomingEvents.slice(0, 3).map((ev) => {
                const type = (ev.event_type || "").toLowerCase();
                const dotColor =
                  type === "project"
                    ? "bg-[#e5484d]" // project coral
                    : type === "exam"
                      ? "bg-[#7c3aed]" // exam purple
                      : type === "backlog"
                        ? "bg-[#9ca3af]" // backlog gray
                        : "bg-[#F6C531]"; // assignment yellow

                const isOverdue = ev.due_date
                  ? new Date(ev.due_date + "T00:00:00Z") <
                    new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z")
                  : false;

                return (
                  <Link
                    key={ev.id}
                    href="/calendar"
                    className="p-2.5 rounded-[12px] bg-white/80 hover:bg-white border border-[var(--card-cream-divider)]/60 transition flex items-center justify-between gap-2.5 text-left shadow-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`size-2.5 rounded-full shrink-0 ${dotColor}`} />
                      <div className="min-w-0">
                        <p className="font-display text-xs font-bold text-[#2B1B5A] truncate">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-[var(--card-cream-text-muted)] capitalize truncate">
                          {ev.event_type} {ev.due_time ? `• ${ev.due_time.slice(0, 5)}` : ""}
                        </p>
                      </div>
                    </div>
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100/90 px-2 py-0.5 rounded-full shrink-0">
                        <AlertCircle size={10} />
                        <span>Overdue</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[var(--card-cream-text-muted)] bg-black/5 px-2 py-0.5 rounded-full shrink-0">
                        {ev.due_date ? formatRelativeDue(ev.due_date) : "Soon"}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="text-[11px] text-[var(--card-cream-text-muted)] border-t border-[var(--card-cream-divider)] pt-2 flex items-center justify-between shrink-0">
            <span>Keep your assignments on track</span>
          </div>
        </div>
      </section>

      {/* 2. BOTTOM ROW (3 equal columns): Study Streak, This Week's Activity, Study Activity Heatmap */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 shrink-0 lg:h-[240px]">
        {/* Column 1: Standalone Study Streak Card (Lilac tint #EFE9FF, subtle border, radius 20px) */}
        <div
          data-surface="lilac"
          className="card-outlined-tint bg-[#EFE9FF] p-4 sm:p-5 flex flex-col justify-between shadow-none select-none"
        >
          <div className="flex items-center justify-between border-b border-black/5 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Flame size={18} className={currentStreak > 0 ? "text-coral" : "text-ink-soft"} />
              <h2 className="font-display text-sm font-bold text-ink">Study Streak</h2>
            </div>
            <span className="text-xs font-semibold text-ink-soft">
              Best: {longestStreak} {longestStreak === 1 ? "day" : "days"}
            </span>
          </div>

          <div className="flex items-center justify-between my-auto py-2">
            <div>
              <span className="font-display text-4xl sm:text-5xl font-extrabold text-ink leading-none">
                {currentStreak}
              </span>
              <p className="text-xs font-bold text-ink-soft mt-1">
                {currentStreak === 1 ? "Current day" : "Current days"}
              </p>
              <p className="text-[11px] text-ink-soft mt-0.5">
                {todayQualified ? "Activity counted today" : "Complete a quiz to qualify"}
              </p>
            </div>
            <div className="shrink-0">
              <Mascot name="sleepy" size="sm" alt="Study streak mascot" />
            </div>
          </div>

          <div className="text-[11px] text-ink-soft border-t border-black/5 pt-2 flex items-center justify-between shrink-0">
            <span>Streak updates automatically</span>
            <Link href="/progress" className="font-bold text-[#6D3BE8] hover:underline">
              Progress →
            </Link>
          </div>
        </div>

        {/* Column 2: This Week's Activity (Outlined-tint card variant: 1px --card-border, Neutral #F7F5FF fill, radius 20px) */}
        <div
          data-surface="neutral"
          className="card-outlined-tint bg-[#F7F5FF] p-4 sm:p-5 flex flex-col justify-between select-none"
        >
          <div className="flex items-center justify-between border-b border-black/5 pb-2 shrink-0">
            <h2 className="font-display text-sm font-bold text-ink">
              This Week&apos;s Activity
            </h2>
            <span className="text-xs font-semibold text-ink-soft">
              {activeDaysThisWeek} of 7 days active
            </span>
          </div>

          {/* 7-Day Mon-Sun Activity Strip (day tiles stay white with no extra border) */}
          <div className="grid grid-cols-7 gap-1.5 my-auto py-2">
            {(thisWeek ?? []).map((day) => (
              <div
                key={day.dateStr}
                title={`${day.dateStr}: ${day.qualified ? "Studied" : "No study"}`}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-[10px] text-center transition ${
                  day.isToday
                    ? "bg-[#6D3BE8] text-white font-bold ring-2 ring-[#6D3BE8]/30"
                    : day.qualified
                      ? "bg-[#EFE9FF] text-[#2B1B5A] font-bold"
                      : "bg-white text-ink-soft"
                }`}
              >
                <span className="text-[10px] font-bold uppercase leading-none">
                  {day.dayName.slice(0, 1)}
                </span>
                <span className="text-xs font-bold mt-1 leading-none">
                  {day.dayNum}
                </span>
                <span className="text-[10px] mt-1 leading-none flex items-center justify-center">
                  {day.qualified ? (
                    <Flame size={11} className="text-amber-500 fill-amber-500 inline" />
                  ) : (
                    "·"
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-ink-soft border-t border-black/5 pt-2 flex items-center justify-between shrink-0">
            <span>Mon–Sun study streak days</span>
            <span className="text-[10px] font-semibold text-ink-soft">UTC timezone</span>
          </div>
        </div>

        {/* Column 3: Study Activity Heatmap (Outlined-tint card variant: 1px --card-border, Neutral #F7F5FF fill, radius 20px) */}
        <div
          data-surface="neutral"
          className="card-outlined-tint bg-[#F7F5FF] p-4 sm:p-5 flex flex-col justify-between select-none"
        >
          <div className="flex items-center justify-between border-b border-black/5 pb-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-coral" />
              <h2 className="font-display text-sm font-bold text-ink">
                Heatmap (12 weeks)
              </h2>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-1 text-[10px] font-semibold text-ink-soft">
              <span>Less</span>
              <span className="size-2 rounded-[2px] bg-[#EFE9FF]" title="Empty / No study" />
              <span className="size-2 rounded-[2px] bg-[#BAA1FC]" title="1-2 activities" />
              <span className="size-2 rounded-[2px] bg-[#6D3BE8]/70" title="3-4 activities" />
              <span className="size-2 rounded-[2px] bg-[#6D3BE8]" title="5+ activities" />
              <span>More</span>
            </div>
          </div>

          {/* 12-week grid + mascot expression */}
          <div className="flex items-center justify-between gap-2 my-auto py-1">
            <div className="overflow-x-auto min-w-0">
              {twelveWeekHeatmap.length > 0 ? (
                <div className="inline-grid grid-flow-col grid-rows-7 gap-1 min-w-max p-0.5">
                  {twelveWeekHeatmap.map((d) => {
                    const bgClass =
                      d.level === 3
                        ? "bg-[#6D3BE8]"
                        : d.level === 2
                          ? "bg-[#6D3BE8]/70"
                          : d.level === 1
                            ? "bg-[#BAA1FC]"
                            : "bg-[#EFE9FF]";
                    return (
                      <div
                        key={d.date}
                        title={`${d.date}: ${d.count} study action${d.count === 1 ? "" : "s"}`}
                        className={`size-2.5 sm:size-3 rounded-[2px] transition-transform hover:scale-125 cursor-pointer ${bgClass}`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="h-28 flex items-center justify-center text-xs text-ink-soft">
                  Start studying to light up your 12-week activity heatmap!
                </div>
              )}
            </div>
            <div className="shrink-0 pr-1">
              <Mascot name="proud" size="sm" alt="Study activity heatmap mascot" />
            </div>
          </div>

          <div className="text-[11px] text-ink-soft border-t border-black/5 pt-2 flex items-center justify-between shrink-0">
            <span>Quizzes & flashcards</span>
            <Link href="/progress" className="font-bold text-[#6D3BE8] hover:underline">
              Detailed Progress →
            </Link>
          </div>
        </div>
      </section>

      {/* Dialogs: Subject creation, joining, and import flows */}
      {showCreate && <CreateSubjectDialog onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinSubjectDialog onClose={() => setShowJoin(false)} />}

      {showImportSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[20px] bg-white p-5 shadow-2xl">
            <h3 className="font-display text-base font-bold text-ink mb-1.5">
              Choose a Subject
            </h3>
            <p className="text-xs text-ink-soft mb-3">
              Select which subject to import your study text into:
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubjectForImport(s.id);
                    setShowImportSelector(false);
                  }}
                  className="w-full p-2.5 rounded-[10px] text-left hover:bg-[#F7F5FF] text-xs font-bold text-ink transition"
                >
                  {s.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowImportSelector(false)}
              className="btn btn-secondary btn-sm w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedSubjectForImport && (
        <TextImportDialog
          subjectId={selectedSubjectForImport}
          onClose={() => setSelectedSubjectForImport(null)}
        />
      )}
    </div>
  );
}