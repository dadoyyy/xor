"use client";

import { useState } from "react";
import { Calendar, Flame, Info } from "lucide-react";
import type { HeatmapCell } from "@/services/progressService";

export default function HeatmapView({
  monthlyCells,
  yearlyCells,
  timezone,
}: {
  monthlyCells: HeatmapCell[];
  yearlyCells: HeatmapCell[];
  timezone: string;
}) {
  const [mode, setMode] = useState<"monthly" | "yearly">("yearly");
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const activeCells = mode === "monthly" ? monthlyCells : yearlyCells;

  return (
    <section className="card p-6 relative">
      {/* Header with Mode Toggle & Legend */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b-2 border-line pb-4">
        <div className="flex items-center gap-2.5">
          <Flame size={22} className="text-coral shrink-0" />
          <div>
            <h2 className="font-display text-lg font-bold">Study Activity Heatmap</h2>
            <p className="text-xs text-ink-soft">
              Track your daily learning consistency in your local timezone ({timezone}).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-full border border-line bg-paper p-0.5">
            <button
              type="button"
              onClick={() => setMode("monthly")}
              className={`rounded-full px-3 py-1 font-display text-xs font-bold transition-all ${
                mode === "monthly"
                  ? "bg-grape text-white"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Monthly (30d)
            </button>
            <button
              type="button"
              onClick={() => setMode("yearly")}
              className={`rounded-full px-3 py-1 font-display text-xs font-bold transition-all ${
                mode === "yearly"
                  ? "bg-grape text-white"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Yearly (52w)
            </button>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <span>Less</span>
            <span className="size-3 rounded-xs border border-line bg-paper" title="0 actions" />
            <span className="size-3 rounded-xs bg-grape-tint" title="1 action" />
            <span className="size-3 rounded-xs bg-grape/60" title="2-4 actions" />
            <span className="size-3 rounded-xs bg-grape" title="5+ actions" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="mt-5 overflow-x-auto pb-3">
        {activeCells.length > 0 ? (
          <div
            className={`inline-grid grid-flow-col gap-1.5 min-w-max p-1 ${
              mode === "monthly" ? "grid-rows-5" : "grid-rows-7"
            }`}
          >
            {activeCells.map((cell) => {
              const bgClass =
                cell.level === 3
                  ? "bg-grape text-white ring-1 ring-grape/40"
                  : cell.level === 2
                    ? "bg-grape/60 text-white"
                    : cell.level === 1
                      ? "bg-grape-tint border border-grape/30"
                      : "bg-paper border border-line";

              return (
                <div
                  key={cell.date}
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell((cur) => (cur?.date === cell.date ? null : cur))}
                  className={`size-3.5 sm:size-4 rounded-xs transition-transform hover:scale-135 hover:z-10 cursor-pointer ${bgClass}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-ink-soft">
            No study activity recorded yet. Take a quiz or review flashcards to light up your grid!
          </div>
        )}
      </div>

      {/* Dynamic Hover Tooltip Bar */}
      <div className="min-h-[2rem] pt-2 border-t border-line/50 flex items-center justify-between text-xs text-ink-soft">
        {hoveredCell ? (
          <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-100">
            <span className="font-bold text-ink flex items-center gap-1">
              <Calendar size={13} className="text-grape" />
              {hoveredCell.date}
            </span>
            <span className="chip border-line bg-lilac/30 text-[11px] font-semibold">
              {hoveredCell.count} total {hoveredCell.count === 1 ? "activity" : "activities"}
            </span>
            {hoveredCell.quizzes > 0 && (
              <span className="text-ink font-medium">
                {hoveredCell.quizzes} {hoveredCell.quizzes === 1 ? "quiz" : "quizzes"}
              </span>
            )}
            {hoveredCell.cards > 0 && (
              <span className="text-ink font-medium">
                {hoveredCell.cards} cards reviewed
              </span>
            )}
            {hoveredCell.materials > 0 && (
              <span className="text-ink font-medium">
                {hoveredCell.materials} materials added
              </span>
            )}
            {hoveredCell.points > 0 && (
              <span className="text-coral font-bold">
                +{hoveredCell.points} pts
              </span>
            )}
            {hoveredCell.qualifies && (
              <span className="chip border-coral/30 bg-coral/10 text-coral text-[11px] font-bold">
                Streak Qualified
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-ink-soft/80">
            <Info size={13} />
            <span>Hover over any day square to see details of your quizzes, flashcards, and uploads.</span>
          </div>
        )}
      </div>
    </section>
  );
}

