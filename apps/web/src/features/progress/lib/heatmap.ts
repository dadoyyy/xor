export type HeatmapCell = {
  date: string; // YYYY-MM-DD
  count: number;
  quizzes: number;
  cards: number;
  materials: number;
  points: number;
  level: 0 | 1 | 2 | 3;
  qualifies: boolean;
};

/**
 * Builds an array of HeatmapCells for a given date range based on raw activity_days records.
 */
export function buildHeatmapCells(
  activityRows: Array<{
    activity_date: string;
    quizzes_completed: number;
    cards_reviewed: number;
    materials_added: number;
    points_earned: number;
    qualifies_for_streak: boolean;
  }>,
  totalDays: number,
  todayStr: string,
): HeatmapCell[] {
  const map = new Map<string, (typeof activityRows)[0]>();
  for (const r of activityRows) {
    map.set(r.activity_date, r);
  }

  const cells: HeatmapCell[] = [];
  const today = new Date(`${todayStr}T00:00:00Z`);

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const row = map.get(dateStr);

    const quizzes = Number(row?.quizzes_completed || 0);
    const cards = Number(row?.cards_reviewed || 0);
    const materials = Number(row?.materials_added || 0);
    const points = Number(row?.points_earned || 0);
    const qualifies = Boolean(row?.qualifies_for_streak);
    const count = quizzes + cards + materials;

    // Levels: 0 = none, 1 = 1 action, 2 = 2-4 actions, 3 = 5+ actions
    const level: 0 | 1 | 2 | 3 = count === 0 ? 0 : count === 1 ? 1 : count <= 4 ? 2 : 3;

    cells.push({
      date: dateStr,
      count,
      quizzes,
      cards,
      materials,
      points,
      level,
      qualifies,
    });
  }

  return cells;
}

