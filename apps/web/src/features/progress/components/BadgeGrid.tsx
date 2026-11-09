import Image from "next/image";
import { Award, Lock, CheckCircle2 } from "lucide-react";
import type { BadgeDefinition } from "@/features/progress/lib/badges";

export default function BadgeGrid({ badges }: { badges: BadgeDefinition[] }) {
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <section className="card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-line pb-4 gap-2">
        <div className="flex items-center gap-2.5">
          <Award size={22} className="text-sun shrink-0" />
          <div>
            <h2 className="font-display text-lg font-bold">Earned Badges & Achievements</h2>
            <p className="text-xs text-ink-soft">
              Milestone awards computed from your learning history and achievements.
            </p>
          </div>
        </div>
        <div className="chip border-line bg-paper text-xs font-bold self-start sm:self-auto">
          {unlockedCount} / {badges.length} Unlocked
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {badges.map((badge) => {
          return (
            <div
              key={badge.id}
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                badge.unlocked
                  ? "border-line bg-paper hover:border-grape/40"
                  : "border-dashed border-line/60 bg-paper/50 opacity-70"
              }`}
            >
              {/* Top Row: Icon + State Badge */}
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`relative size-16 shrink-0 rounded-xl border p-1.5 flex items-center justify-center ${
                    badge.unlocked
                      ? "border-line bg-cream"
                      : "border-line/40 bg-lilac/30 grayscale contrast-75"
                  }`}
                >
                  <Image
                    src={badge.icon}
                    alt={badge.name}
                    width={56}
                    height={56}
                    className="object-contain"
                  />
                  {!badge.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink/20 backdrop-blur-[0.5px]">
                      <Lock size={18} className="text-white drop-shadow-md" />
                    </div>
                  )}
                </div>

                {badge.unlocked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 size={12} />
                    Earned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-paper border border-line px-2.5 py-0.5 text-[11px] font-semibold text-ink-soft">
                    <Lock size={10} />
                    Locked
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div className="mt-3 space-y-1">
                <h3 className="font-display text-sm font-bold text-ink">{badge.name}</h3>
                <p className="text-xs text-ink-soft leading-relaxed">{badge.description}</p>
              </div>

              {/* Bottom Progress Text */}
              <div className="mt-4 pt-2.5 border-t border-line/40 flex items-center justify-between text-[11px] font-semibold text-ink-soft">
                <span>{badge.progressText}</span>
                {badge.unlockedAt && (
                  <span className="text-[10px] text-ink-soft/70">
                    {new Date(badge.unlockedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

