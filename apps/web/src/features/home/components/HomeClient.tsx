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
} from "lucide-react";
import { CORGI_ASSETS } from "@/lib/mascot/assets";
import CreateSubjectDialog from "@/features/rooms/components/CreateSubjectDialog";
import JoinSubjectDialog from "@/features/rooms/components/JoinSubjectDialog";
import TextImportDialog from "@/features/materials/components/TextImportDialog";
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
}: {
  username: string;
  streak: StreakSummary | null;
  subjects: LibrarySubjectItem[];
  lastStudied?: LastStudiedItem | null;
  thisWeek?: WeekDayActivity[] | null;
  upcomingEvents?: CalendarEvent[] | null;
  heatmap?: HeatmapItem[] | null;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showImportSelector, setShowImportSelector] = useState(false);
  const [selectedSubjectForImport, setSelectedSubjectForImport] = useState<string | null>(null);

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const todayQualified = streak?.todayQualified ?? false;

  const greeting = `${getTimeOfDayGreeting()}, ${username}! 👋`;

  const nextEvent = upcomingEvents && upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  const headerSubtitle = nextEvent
    ? `Next deadline: ${nextEvent.title} (${nextEvent.due_date ? formatRelativeDue(nextEvent.due_date) : "soon"})`
    : currentStreak > 0
      ? `Keep your ${currentStreak}-day study streak going with a quick review today.`
      : "Ready for today's study session? Practice flashcards or take a quiz to begin.";

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
    <div className="flex flex-col h-full gap-3 sm:gap-4 p-3 sm:p-5 lg:p-6 overflow-y-auto lg:overflow-hidden min-h-0">
      {/* 1. TOP ROW: Hero Card (col-span-8) + Upcoming Deadlines Pastel Accent Card (col-span-4) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 shrink-0 lg:h-[280px]">
        {/* Left Hero Card: Diagonal gradient (#DCD0FF to #FFF6E3), borderless, radius 20px */}
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#DCD0FF] to-[#FFF6E3] p-5 sm:p-6 lg:p-7 lg:col-span-8 flex flex-col justify-between shadow-none select-none">
          {/* Top text area */}
          <div className="max-w-md z-10">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink leading-tight">
              {greeting}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-soft/90 line-clamp-1">
              {headerSubtitle}
            </p>

            {/* Big streak numeral inside hero */}
            <div className="mt-3 sm:mt-4 flex items-baseline gap-3">
              <span className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink leading-none">
                {currentStreak}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-ink-soft">
                  {currentStreak === 1 ? "day streak" : "days streak"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-bold text-ink shadow-none">
                  Best: {longestStreak} {longestStreak === 1 ? "day" : "days"}
                </span>
                {todayQualified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-mint/20 px-2.5 py-0.5 text-[11px] font-bold text-mint shadow-none">
                    Active today 🔥
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions (Flat 10px radius buttons) */}
          <div className="mt-4 flex flex-wrap items-center gap-2 z-10">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-none"
            >
              <BookPlus size={15} />
              <span>Create a Subject</span>
            </button>
            <button
              type="button"
              onClick={() => setShowJoin(true)}
              className="btn btn-secondary btn-sm flex items-center gap-1.5 shadow-none"
            >
              <KeyRound size={15} />
              <span>Join with a Key</span>
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="btn btn-accent btn-sm flex items-center gap-1.5 shadow-none"
            >
              <FileText size={15} />
              <span>Import Text</span>
            </button>
          </div>

          {/* Corgi Mascot Illustration on the right */}
          <div className="pointer-events-none absolute right-4 sm:right-6 top-3 sm:top-4 size-32 sm:size-40 lg:size-44 opacity-90 transition-transform hidden sm:block">
            <Image
              src={CORGI_ASSETS.happy.src}
              alt="xor study companion"
              width={176}
              height={176}
              className="object-contain"
              priority
            />
          </div>

          {/* Corner-Anchored CTA (matching the reference's anchored button) */}
          <div className="absolute right-0 bottom-0 z-20">
            {lastStudied ? (
              <Link
                href={`/subjects/${lastStudied.subjectId}/${lastStudied.kind === "quiz" ? "quizzes" : "flashcards"}/${lastStudied.id}`}
                className="inline-flex items-center gap-2 rounded-tl-[16px] bg-[#5223BD] px-4 py-2.5 font-display text-xs sm:text-sm font-bold text-white transition hover:bg-[#431ca3] active:scale-98 shadow-none"
              >
                <span>Resume {lastStudied.kind === "quiz" ? "Quiz" : "Deck"}</span>
                <ChevronRight size={16} />
              </Link>
            ) : (
              <Link
                href="/subjects"
                className="inline-flex items-center gap-2 rounded-tl-[16px] bg-[#5223BD] px-4 py-2.5 font-display text-xs sm:text-sm font-bold text-white transition hover:bg-[#431ca3] active:scale-98 shadow-none"
              >
                <span>Start Studying</span>
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>

        {/* Right Pastel Accent Card: Upcoming Deadlines (#FFF1C2 yellow tint, borderless, radius 20px) */}
        <div className="rounded-[20px] bg-[#FFF1C2] p-5 sm:p-6 lg:col-span-4 flex flex-col justify-between shadow-none select-none">
          <div className="flex items-center justify-between border-b border-black/5 pb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <CalendarIcon size={18} className="text-ink" />
              <h2 className="font-display text-sm sm:text-base font-bold text-ink">
                Upcoming Deadlines
              </h2>
            </div>
            <Link
              href="/calendar"
              className="text-xs font-bold text-[#5223BD] hover:underline flex items-center gap-0.5"
            >
              <span>View Calendar</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {!upcomingEvents || upcomingEvents.length === 0 ? (
            /* Compact empty state */
            <div className="py-3 flex flex-col items-center justify-center text-center my-auto">
              <div className="relative size-12 mb-2">
                <Image
                  src={CORGI_ASSETS.thinking.src}
                  alt={CORGI_ASSETS.thinking.alt}
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <p className="text-xs text-ink-soft mb-2.5">
                No upcoming deadlines on your academic calendar.
              </p>
              <Link
                href="/calendar"
                className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 shadow-none text-xs"
              >
                <Plus size={13} />
                <span>Add deadline</span>
              </Link>
            </div>
          ) : (
            /* List of up to 3 upcoming events with colored dots */
            <div className="space-y-2 py-2 overflow-y-auto min-h-0 my-auto">
              {upcomingEvents.slice(0, 3).map((ev, idx) => {
                const dotColor =
                  idx === 0
                    ? "bg-[#7c3aed]"
                    : idx === 1
                      ? "bg-[#ffcc33]"
                      : "bg-[#16a34a]";
                return (
                  <Link
                    key={ev.id}
                    href="/calendar"
                    className="p-2.5 rounded-[12px] bg-white/70 hover:bg-white transition flex items-center justify-between gap-2.5 text-left shadow-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`size-2.5 rounded-full shrink-0 ${dotColor}`} />
                      <div className="min-w-0">
                        <p className="font-display text-xs font-bold text-ink truncate">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-ink-soft capitalize truncate">
                          {ev.event_type} {ev.due_time ? `• ${ev.due_time.slice(0, 5)}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-ink-soft bg-black/5 px-2 py-0.5 rounded-full shrink-0">
                      {ev.due_date ? formatRelativeDue(ev.due_date) : "Soon"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="text-[11px] text-ink-soft border-t border-black/5 pt-2 flex items-center justify-between shrink-0">
            <span>Keep your assignments on track</span>
          </div>
        </div>
      </section>

      {/* 2. BOTTOM ROW (3 equal columns): Study Streak, This Week's Activity, Study Activity Heatmap */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 shrink-0 lg:h-[240px]">
        {/* Column 1: Study Streak Card (Lilac tint #EFE9FF, borderless, radius 20px) */}
        <div className="rounded-[20px] bg-[#EFE9FF] p-4 sm:p-5 flex flex-col justify-between shadow-none select-none">
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
                {todayQualified ? "Activity counted today 🔥" : "Complete a quiz to qualify"}
              </p>
            </div>
            <div className="relative size-16 shrink-0">
              <Image
                src={CORGI_ASSETS.proud.src}
                alt="Streak mascot badge"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
          </div>

          <div className="text-[11px] text-ink-soft border-t border-black/5 pt-2 flex items-center justify-between shrink-0">
            <span>Streak updates automatically</span>
            <Link href="/progress" className="font-bold text-[#5223BD] hover:underline">
              Progress →
            </Link>
          </div>
        </div>

        {/* Column 2: This Week's Activity (Neutral #F7F5FF, borderless, radius 20px) */}
        <div className="rounded-[20px] bg-[#F7F5FF] p-4 sm:p-5 flex flex-col justify-between shadow-none select-none">
          <div className="flex items-center justify-between border-b border-black/5 pb-2 shrink-0">
            <h2 className="font-display text-sm font-bold text-ink">This Week&apos;s Activity</h2>
            <span className="text-xs font-semibold text-ink-soft">
              {activeDaysThisWeek} of 7 days active
            </span>
          </div>

          {/* 7-Day Mon-Sun Activity Strip */}
          <div className="grid grid-cols-7 gap-1.5 my-auto py-2">
            {(thisWeek ?? []).map((day) => (
              <div
                key={day.dateStr}
                title={`${day.dateStr}: ${day.qualified ? "Studied" : "No study"}`}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-[10px] text-center transition ${
                  day.isToday
                    ? "bg-[#5223BD] text-white font-bold"
                    : day.qualified
                      ? "bg-[#EFE9FF] text-[#5223BD] font-bold"
                      : "bg-white text-ink-soft"
                }`}
              >
                <span className="text-[10px] font-bold uppercase leading-none">
                  {day.dayName.slice(0, 1)}
                </span>
                <span className="text-xs font-bold mt-1 leading-none">
                  {day.dayNum}
                </span>
                <span className="text-[10px] mt-1 leading-none">
                  {day.qualified ? "🔥" : "·"}
                </span>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-ink-soft border-t border-black/5 pt-2 flex items-center justify-between shrink-0">
            <span>Mon–Sun study streak days</span>
            <span className="text-[10px] font-semibold text-ink-soft">UTC timezone</span>
          </div>
        </div>

        {/* Column 3: Study Activity Heatmap (12 weeks, Neutral #F7F5FF, borderless, radius 20px) */}
        <div className="rounded-[20px] bg-[#F7F5FF] p-4 sm:p-5 flex flex-col justify-between shadow-none select-none">
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
              <span className="size-2 rounded-[2px] bg-white border border-black/10" />
              <span className="size-2 rounded-[2px] bg-[#EFE9FF]" />
              <span className="size-2 rounded-[2px] bg-[#7c3aed]/60" />
              <span className="size-2 rounded-[2px] bg-[#7c3aed]" />
              <span>More</span>
            </div>
          </div>

          {/* Compact 12-week grid (7 rows x 12 cols = 84 cells) */}
          <div className="overflow-x-auto py-1 my-auto">
            {twelveWeekHeatmap.length > 0 ? (
              <div className="inline-grid grid-flow-col grid-rows-7 gap-1 min-w-max p-0.5">
                {twelveWeekHeatmap.map((d) => {
                  const bgClass =
                    d.level === 3
                      ? "bg-[#7c3aed] text-white"
                      : d.level === 2
                        ? "bg-[#7c3aed]/60"
                        : d.level === 1
                          ? "bg-[#EFE9FF]"
                          : "bg-white border border-black/5";
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
              <div className="text-center py-3 text-xs text-ink-soft">
                Start studying to light up your 12-week activity heatmap!
              </div>
            )}
          </div>

          <div className="text-[11px] text-ink-soft border-t border-black/5 pt-2 flex items-center justify-between shrink-0">
            <span>Quizzes & flashcards</span>
            <Link href="/progress" className="font-bold text-[#5223BD] hover:underline">
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
