"use client";

import { useState } from "react";
import Mascot from "@/components/ui/Mascot";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  FolderKanban,
  Layers,
  Sparkles,
  Trophy,
  Upload,
} from "lucide-react";

type ImportPresetKey = "mixed" | "qa" | "mcq" | "pdf";

const IMPORT_PRESETS: Record<
  ImportPresetKey,
  {
    label: string;
    badge: string;
    mascot: "quiz-time" | "flashcards" | "upload-pdf";
    rawTitle: string;
    rawContent: string;
    parsedItems: Array<{
      type: "MCQ" | "FILL_BLANK" | "FLASHCARD";
      prompt: string;
      choices?: string[];
      answer: string;
    }>;
  }
> = {
  mixed: {
    label: "Mixed MCQ + Fill-in-Blank",
    badge: "Most popular",
    mascot: "quiz-time",
    rawTitle: "cell_energetics_mixed.txt",
    rawContent: `[MCQ] Which organelle produces the majority of cellular ATP?
A) Ribosome   B) Mitochondrion *   C) Golgi body   D) Nucleus

[BLANK] Glycolysis breaks glucose into two ________ molecules.
ANSWER: pyruvate`,
    parsedItems: [
      {
        type: "MCQ",
        prompt: "Which organelle produces the majority of cellular ATP?",
        choices: ["Ribosome", "Mitochondrion", "Golgi body", "Nucleus"],
        answer: "Mitochondrion",
      },
      {
        type: "FILL_BLANK",
        prompt: "Glycolysis breaks glucose into two ________ molecules.",
        answer: "pyruvate",
      },
    ],
  },
  qa: {
    label: "Q&A Flashcards Text",
    badge: "Instant deck",
    mascot: "flashcards",
    rawTitle: "operating_systems_qa.txt",
    rawContent: `Q: What is the difference between a process and a thread?
A: A process has its own isolated virtual address space, while threads share the address space of their parent process.`,
    parsedItems: [
      {
        type: "FLASHCARD",
        prompt: "What is the difference between a process and a thread?",
        answer:
          "A process has its own isolated virtual address space, while threads share their parent process address space.",
      },
    ],
  },
  mcq: {
    label: "Formatted Multiple Choice",
    badge: "Auto-graded",
    mascot: "quiz-time",
    rawTitle: "algorithms_quiz_import.txt",
    rawContent: `1. What is the worst-case lookup time in a balanced AVL tree?
a) O(1)
b) O(log n) *
c) O(n)
d) O(n log n)`,
    parsedItems: [
      {
        type: "MCQ",
        prompt: "What is the worst-case lookup time in a balanced AVL tree?",
        choices: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        answer: "O(log n)",
      },
    ],
  },
  pdf: {
    label: "Lecture PDF Upload",
    badge: "Up to 50 MB",
    mascot: "upload-pdf",
    rawTitle: "CS301_Database_Normalization.pdf (38 pages)",
    rawContent: `Extracted from PDF Sections 4.1 – 4.3:
• 2NF: Remove partial dependencies on a composite primary key.
• BCNF: Every determinant must be a candidate key.`,
    parsedItems: [
      {
        type: "MCQ",
        prompt: "Removing partial dependencies on a composite primary key achieves which normal form?",
        choices: ["1NF", "2NF", "3NF", "BCNF"],
        answer: "2NF",
      },
    ],
  },
};

type CalendarTask = {
  id: string;
  day: number;
  title: string;
  course: string;
  category: "Project" | "Backlog" | "Assignment" | "Quiz";
  dueTime: string;
  status: "urgent" | "upcoming" | "done";
};

const CALENDAR_TASKS: CalendarTask[] = [
  {
    id: "t1",
    day: 5,
    title: "Import Ch. 4 Q&A + Fill-in-Blank deck",
    course: "BIO 101",
    category: "Backlog",
    dueTime: "Completed",
    status: "done",
  },
  {
    id: "t2",
    day: 12,
    title: "Database ER Diagram & Schema Milestone",
    course: "CS 301",
    category: "Project",
    dueTime: "Today · 11:59 PM",
    status: "urgent",
  },
  {
    id: "t3",
    day: 14,
    title: "Problem Set 5: Dynamic Programming",
    course: "CS 204",
    category: "Assignment",
    dueTime: "Thu · 5:00 PM",
    status: "upcoming",
  },
  {
    id: "t4",
    day: 18,
    title: "Group Room Mixed Quiz (MCQ + Blank)",
    course: "BIO 101",
    category: "Quiz",
    dueTime: "Mon · 8:00 PM",
    status: "upcoming",
  },
];

const STREAK_WEEKS: number[][] = [
  [0, 1, 2, 1, 3, 2, 0],
  [1, 2, 2, 3, 4, 1, 1],
  [2, 3, 1, 2, 3, 4, 2],
  [0, 2, 3, 4, 3, 2, 1],
  [1, 3, 4, 2, 3, 3, 2],
  [2, 2, 3, 4, 4, 3, 1],
  [1, 3, 2, 3, 4, 2, 2],
  [2, 4, 3, 4, 3, 4, 3],
  [3, 3, 4, 4, 2, 3, 2],
  [2, 3, 4, 3, 4, 4, 3],
  [3, 4, 4, 3, 4, 3, 4],
  [4, 4, 3, 4, 4, 4, 4],
];

const BADGE_ITEMS: Array<{
  mood:
    | "first-room"
    | "streak-7"
    | "perfect-score"
    | "leaderboard-1st"
    | "flashcard-master"
    | "joined-room";
  title: string;
  subtitle: string;
}> = [
  {
    mood: "streak-7",
    title: "7-Day Streak",
    subtitle: "7 consecutive days",
  },
  {
    mood: "perfect-score",
    title: "Perfect Score",
    subtitle: "100% on a room quiz",
  },
  {
    mood: "flashcard-master",
    title: "Flashcard Master",
    subtitle: "100+ cards mastered",
  },
  {
    mood: "leaderboard-1st",
    title: "1st on Board",
    subtitle: "Top room rank",
  },
  {
    mood: "first-room",
    title: "Room Founder",
    subtitle: "Created first room",
  },
  {
    mood: "joined-room",
    title: "Squad Member",
    subtitle: "Joined with a key",
  },
];

export default function LandingSections() {
  const [activePreset, setActivePreset] = useState<ImportPresetKey>("mixed");
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | "Project" | "Backlog" | "Assignment" | "Quiz"
  >("All");

  const preset = IMPORT_PRESETS[activePreset];
  const filteredTasks =
    selectedCategory === "All"
      ? CALENDAR_TASKS
      : CALENDAR_TASKS.filter((t) => t.category === selectedCategory);

  return (
    <div className="space-y-16">
      {/* PILLAR 1: MULTI-FORMAT SMART IMPORT */}
      <section id="smart-import" className="page-x scroll-mt-24">
        <div className="mx-auto max-w-7xl">
          {/* Header Only (Buttons removed from beside the header) */}
          <div className="max-w-3xl">
            <span className="chip border-grape bg-grape-tint text-grape">
              <Sparkles size={14} /> Smart Content &amp; Text Importer
            </span>
            <h2 className="mt-2.5 text-3xl font-bold sm:text-4xl">
              More than PDFs. Import formatted Q&amp;A, Multiple Choice &amp; Fill-in-the-Blank sets.
            </h2>
            <p className="mt-2 text-base text-ink-soft">
              Drop in a 50 MB lecture PDF or paste ready-to-generate text. xor parses Question &amp; Answer flashcards, standalone Multiple Choice, or mixed Multiple Choice + Fill-in-the-Blank assessments in one click.
            </p>
          </div>

          {/* 4 Aligned Format Buttons Placed Directly Above the Cards */}
          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(IMPORT_PRESETS) as ImportPresetKey[]).map((key) => {
              const item = IMPORT_PRESETS[key];
              const isActive = activePreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActivePreset(key)}
                  className={`btn btn-sm w-full justify-center text-center ${
                    isActive ? "btn-primary" : ""
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Two Equal-Height Cards Below the 4 Buttons */}
          <div className="mt-4 grid items-stretch gap-6 lg:grid-cols-2">
            {/* Left: Source Input Card */}
            <div className="card flex flex-col p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 border-b-2 border-line pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-grid size-9 place-items-center rounded-xl bg-grape-tint text-grape">
                    {activePreset === "pdf" ? <Upload size={18} /> : <FileText size={18} />}
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      Source Input
                    </p>
                    <p className="font-display text-base font-semibold">{preset.rawTitle}</p>
                  </div>
                </div>
                <span className="chip border-sun bg-sun-tint text-ink">{preset.badge}</span>
              </div>

              <pre className="mt-4 flex-1 overflow-x-auto rounded-2xl border-2 border-line bg-lilac p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-ink">
                {preset.rawContent}
              </pre>
            </div>

            {/* Right: Generated Study Set Card */}
            <div className="card flex flex-col p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 border-b-2 border-line pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-grid size-9 place-items-center rounded-xl bg-sun-tint text-ink">
                    <Layers size={18} />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      Generated Room Output
                    </p>
                    <p className="font-display text-base font-semibold">
                      Interactive Flashcards &amp; Mixed Quiz Preview
                    </p>
                  </div>
                </div>
                <span className="chip border-mint bg-mint-tint text-mint">
                  <CheckCircle2 size={14} /> Instant Parser
                </span>
              </div>

              <div className="mt-4 flex flex-1 flex-col justify-center space-y-3">
                {preset.parsedItems.map((item, idx) => (
                  <div key={idx} className="card-flat bg-paper p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`chip ${
                          item.type === "MCQ"
                            ? "border-grape bg-grape-tint text-grape"
                            : item.type === "FILL_BLANK"
                              ? "border-sun bg-sun-tint text-ink"
                              : "border-mint bg-mint-tint text-mint"
                        }`}
                      >
                        {item.type === "MCQ"
                          ? "Multiple Choice"
                          : item.type === "FILL_BLANK"
                            ? "Fill in the Blank"
                            : "Q&A Flashcard"}
                      </span>
                      <span className="text-xs font-bold text-ink-soft">Item #{idx + 1}</span>
                    </div>

                    <p className="mt-2 font-display text-base font-semibold text-ink">{item.prompt}</p>

                    {item.choices ? (
                      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        {item.choices.map((choice) => {
                          const isCorrect = choice === item.answer;
                          return (
                            <div
                              key={choice}
                              className={`rounded-xl border-2 px-3 py-1.5 text-sm font-semibold ${
                                isCorrect
                                  ? "border-grape bg-grape-tint text-ink"
                                  : "border-line bg-paper text-ink-soft"
                              }`}
                            >
                              <span>{choice}</span>
                              {isCorrect && (
                                <span className="float-right inline-flex items-center text-grape" suppressHydrationWarning>
                                  <Check size={16} />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : item.type === "FILL_BLANK" ? (
                      <div className="mt-2.5 flex items-center gap-2 rounded-xl border-2 border-sun bg-sun-tint px-3 py-1.5 text-sm">
                        <span className="font-bold text-ink-soft">Blank Answer:</span>
                        <span className="key-text rounded-lg border-2 border-line bg-paper px-2 py-0.5 text-ink">
                          {item.answer}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2.5 rounded-xl border-2 border-line bg-lilac px-3 py-2 text-sm text-ink">
                        <span className="font-bold text-grape">A: </span>
                        {item.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLAR 2: PERSONAL ACADEMIC CALENDAR & BACKLOG TRACKER */}
      <section id="calendar-planner" className="bg-lilac py-14 lg:py-16 scroll-mt-20">
        <div className="page-x mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <span className="chip border-sun bg-sun-tint text-ink">
              <CalendarIcon size={14} /> Personal Academic Calendar
            </span>
            <h2 className="mt-2.5 text-3xl font-bold sm:text-4xl">
              Track projects, study backlogs, and assignment due dates
            </h2>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {(["All", "Project", "Backlog", "Assignment", "Quiz"] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`btn btn-sm w-full justify-center text-center ${
                  selectedCategory === cat ? "btn-primary" : ""
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            {/* Monthly Calendar Grid */}
            <div className="card p-5 sm:p-6">
              <div className="flex items-center justify-between border-b-2 border-line pb-3.5">
                <h3 className="font-display text-lg font-bold">November 2026</h3>
                <div className="flex items-center gap-2">
                  <span className="chip border-coral bg-coral-tint text-coral">1 Due Today</span>
                  <span className="chip border-grape bg-grape-tint text-grape">2 Upcoming</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-ink-soft">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="mt-1 grid grid-cols-7 gap-1.5">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                  const task = CALENDAR_TASKS.find((t) => t.day === day);
                  const isToday = day === 12;
                  return (
                    <div
                      key={day}
                      className={`flex min-h-12 flex-col justify-between rounded-xl border-2 p-1.5 text-xs font-bold ${
                        isToday
                          ? "border-grape bg-grape-tint text-ink"
                          : task
                            ? "border-sun bg-sun-tint text-ink"
                            : "border-line bg-paper text-ink-soft"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{day}</span>
                        {isToday && (
                          <span className="rounded-full bg-grape px-1 text-[9px] text-white">Now</span>
                        )}
                      </div>
                      {task && (
                        <span
                          className={`truncate rounded px-1 py-0.5 text-[10px] font-bold ${
                            task.status === "done"
                              ? "bg-mint-tint text-mint"
                              : task.status === "urgent"
                                ? "bg-coral text-white"
                                : "bg-grape text-white"
                          }`}
                        >
                          {task.category}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming Projects, Backlogs & Assignments List */}
            <div className="card p-5 sm:p-6">
              <div className="flex items-center justify-between border-b-2 border-line pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="inline-grid size-9 place-items-center rounded-xl bg-grape-tint text-grape">
                    <FolderKanban size={18} />
                  </span>
                  <h3 className="font-display text-lg font-bold">Upcoming Deadlines</h3>
                </div>
                <Mascot mood="thinking" size={44} />
              </div>

              <div className="mt-4 space-y-3">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="card-flat flex flex-wrap items-center justify-between gap-3 bg-paper p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-grid size-9 shrink-0 place-items-center rounded-xl font-display text-xs font-bold ${
                          task.status === "urgent"
                            ? "bg-coral-tint text-coral"
                            : task.status === "done"
                              ? "bg-mint-tint text-mint"
                              : "bg-grape-tint text-grape"
                        }`}
                      >
                        Nov {task.day}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="chip">{task.course}</span>
                          <span className="chip border-line bg-lilac text-ink">{task.category}</span>
                        </div>
                        <p className="mt-1 font-display text-base font-semibold text-ink">{task.title}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {task.status === "done" ? (
                        <span className="chip border-mint bg-mint-tint text-mint">
                          <CheckCircle2 size={13} /> Done
                        </span>
                      ) : task.status === "urgent" ? (
                        <span className="chip border-coral bg-coral-tint text-coral">
                          <Clock size={13} /> {task.dueTime}
                        </span>
                      ) : (
                        <span className="chip text-ink-soft">
                          <Clock size={13} /> {task.dueTime}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLAR 3: GITHUB-STYLE MONTHLY STUDY STREAK & CORGI BADGES */}
      <section id="study-streaks" className="page-x scroll-mt-24">
        <div className="mx-auto max-w-7xl">
          <div>
            <span className="chip border-grape bg-grape-tint text-grape">
              <Flame size={14} /> Monthly Activity &amp; Achievements
            </span>
            <h2 className="mt-2.5 text-3xl font-bold sm:text-4xl">
              GitHub-style study streaks and unlockable Corgi badges
            </h2>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            {/* GitHub-Style Contribution Heatmap Card */}
            <div className="card flex flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line pb-3.5">
                  <div className="flex items-center gap-3">
                    <Mascot mood="streak-7" size={50} />
                    <div>
                      <h3 className="font-display text-xl font-bold">18-Day Active Streak</h3>
                      <p className="text-xs text-ink-soft">284 study activities logged this semester</p>
                    </div>
                  </div>
                  <span className="chip border-sun bg-sun-tint text-ink">Top 5% this month</span>
                </div>

                <div className="mt-4 flex justify-between px-2 text-xs font-bold text-ink-soft">
                  <span>September</span>
                  <span>October</span>
                  <span>November</span>
                </div>

                <div className="mt-2 overflow-x-auto pb-1">
                  <div className="grid min-w-[440px] grid-cols-12 gap-2">
                    {STREAK_WEEKS.map((week, wIdx) => (
                      <div key={wIdx} className="grid grid-rows-7 gap-2">
                        {week.map((level, dIdx) => {
                          const cellClass =
                            level === 0
                              ? "border-line bg-lilac"
                              : level === 1
                                ? "border-line bg-grape-tint"
                                : level === 2
                                  ? "border-grape bg-grape/60"
                                  : level === 3
                                    ? "border-grape bg-grape"
                                    : "border-sun-deep bg-sun";
                          return (
                            <div
                              key={dIdx}
                              className={`h-5 w-full rounded-md border-2 ${cellClass}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="card-flat bg-lilac p-3 text-center">
                  <p className="font-display text-xl font-bold text-grape">18d</p>
                  <p className="text-xs font-bold text-ink-soft">Current Streak</p>
                </div>
                <div className="card-flat bg-lilac p-3 text-center">
                  <p className="font-display text-xl font-bold text-ink">420</p>
                  <p className="text-xs font-bold text-ink-soft">Cards Mastered</p>
                </div>
                <div className="card-flat bg-sun-tint p-3 text-center">
                  <p className="font-display text-xl font-bold text-ink">96%</p>
                  <p className="text-xs font-bold text-ink-soft">On-Time Tasks</p>
                </div>
              </div>
            </div>

            {/* Corgi Achievement Badges Grid */}
            <div className="card p-5 sm:p-6">
              <div className="flex items-center justify-between border-b-2 border-line pb-3.5">
                <h3 className="font-display text-lg font-bold">Unlockable Corgi Badges</h3>
                <span className="chip border-grape bg-grape-tint text-grape">
                  <Trophy size={14} /> 6 Badges
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {BADGE_ITEMS.map((badge) => (
                  <div
                    key={badge.mood}
                    className="card-flat card-link flex flex-col items-center bg-paper p-3 text-center"
                  >
                    <Mascot mood={badge.mood} size={76} />
                    <p className="mt-1.5 font-display text-sm font-bold text-ink">{badge.title}</p>
                    <p className="text-xs text-ink-soft">{badge.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

