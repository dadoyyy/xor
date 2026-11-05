import Mascot from "@/components/Mascot";

export type LbRow = { userId: string; username: string; primary: string; secondary?: string; rank: number };

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM_TINT = ["border-sun bg-sun", "border-grape bg-grape text-white", "border-line bg-lilac"];
const PODIUM_H = ["h-28", "h-20", "h-14"];

export default function Leaderboard({ rows, meId, empty }: { rows: LbRow[]; meId: string; empty: string }) {
  if (!rows.length)
    return (
      <div className="card flex flex-col items-center px-6 py-14 text-center">
        <Mascot size={72} mood="sleepy" />
        <p className="mt-3 font-semibold text-ink-soft">{empty}</p>
      </div>
    );

  const top = rows.filter((r) => r.rank <= 3).slice(0, 3);
  // podium order: 2nd, 1st, 3rd
  const podium = [top[1], top[0], top[2]].filter(Boolean);

  return (
    <div className="grid gap-5">
      <div className="flex items-end justify-center gap-2 pt-4 sm:gap-4">
        {podium.map((r) => {
          const idx = Math.min(r.rank, 3) - 1;
          return (
            <div key={r.userId} className="flex w-[30%] max-w-44 flex-col items-center text-center">
              <span className="text-3xl" aria-hidden>
                {MEDAL[idx]}
              </span>
              <p className={`w-full truncate font-display font-semibold ${r.userId === meId ? "text-grape" : ""}`}>{r.username}</p>
              <p className="text-sm font-bold text-ink-soft">{r.primary}</p>
              <div className={`mt-2 grid w-full place-items-center rounded-t-[22px] border-2 border-b-0 font-display text-2xl font-bold ${PODIUM_H[idx]} ${PODIUM_TINT[idx]}`}>
                {r.rank}
              </div>
            </div>
          );
        })}
      </div>

      <ol className="card divide-y-2 divide-lilac p-2">
        {rows.map((r) => (
          <li
            key={r.userId}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${r.userId === meId ? "bg-sun-tint" : ""}`}
          >
            <span className="w-8 text-center font-display text-lg font-bold">{r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}</span>
            <span className="min-w-0 flex-1 truncate font-bold">
              {r.username} {r.userId === meId && <span className="font-semibold text-ink-soft">(you)</span>}
            </span>
            {r.secondary && <span className="hidden text-sm text-ink-soft sm:inline">{r.secondary}</span>}
            <span className="font-display font-semibold">{r.primary}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
