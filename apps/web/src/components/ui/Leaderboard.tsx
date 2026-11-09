import Mascot from "@/components/ui/Mascot";

export type LbRow = { userId: string; username: string; primary: string; secondary?: string; rank: number };

export default function Leaderboard({ rows, meId, empty }: { rows: LbRow[]; meId: string; empty: string }) {
  if (!rows.length)
    return (
      <div className="rounded-[20px] bg-[#F7F5FF] flex flex-col items-center px-6 py-12 text-center shadow-none select-none">
        <Mascot size={64} mood="sleepy" />
        <p className="mt-3 font-display text-sm font-bold text-ink-soft">{empty}</p>
      </div>
    );

  return (
    <div className="grid gap-4 select-none">
      <ol className="rounded-[20px] bg-[#F7F5FF] p-2 space-y-1 shadow-none">
        {rows.map((r) => {
          const isMe = r.userId === meId;
          const isGold = r.rank === 1;
          const isSilver = r.rank === 2;
          const isBronze = r.rank === 3;

          const medalChip = isGold ? (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#FFF1C2] text-xs font-bold text-ink">
              1
            </span>
          ) : isSilver ? (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#E5E7EB] text-xs font-bold text-ink">
              2
            </span>
          ) : isBronze ? (
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#FED7AA] text-xs font-bold text-ink">
              3
            </span>
          ) : (
            <span className="inline-flex size-6 items-center justify-center font-display text-xs font-bold text-ink-soft">
              {r.rank}
            </span>
          );

          return (
            <li
              key={r.userId}
              className={`flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 transition ${
                isMe ? "bg-[#EFE9FF] text-[#5223BD]" : "bg-white text-ink hover:bg-white/80"
              }`}
            >
              {/* Rank Badge */}
              <div className="w-7 text-center shrink-0">{medalChip}</div>

              {/* Avatar circle */}
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${
                  isMe ? "bg-[#5223BD] text-white" : "bg-[#F7F5FF] text-ink"
                }`}
              >
                {r.username.charAt(0).toUpperCase()}
              </div>

              {/* Username + Me indicator */}
              <div className="min-w-0 flex-1 truncate">
                <span className="font-display text-sm font-bold truncate">
                  {r.username}
                </span>
                {isMe && (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-[#5223BD]/10 px-2 py-0.5 text-[10px] font-bold text-[#5223BD]">
                    You
                  </span>
                )}
              </div>

              {/* Quizzes / secondary stats */}
              {r.secondary && (
                <span className="hidden text-xs text-ink-soft sm:inline shrink-0">
                  {r.secondary}
                </span>
              )}

              {/* Points */}
              <span className="font-display text-sm font-extrabold shrink-0">
                {r.primary}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}


