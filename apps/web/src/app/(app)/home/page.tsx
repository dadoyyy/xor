import { requireProfile } from "@/services/authService";
import { HomeClient } from "@/features/home";
import type { LibrarySubjectItem } from "@/features/rooms/components/LibraryClient";
import type { LastStudiedItem, WeekDayActivity } from "@/features/home/components/HomeClient";
import { getStreakSummary, getUserActivityHeatmap } from "@/services/activityService";
import { listUserCalendarEvents } from "@/services/calendarService";
import type { CalendarEvent } from "@/types/subject";

export const metadata = { title: "xor" };

function computeServerScene(timezone?: string | null): {
  scene: "morning" | "afternoon" | "evening";
  greeting: string;
} {
  let hour: number;
  try {
    if (timezone) {
      const timeStr = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        hour12: false,
      }).format(new Date());
      hour = parseInt(timeStr, 10);
    } else {
      hour = new Date().getHours();
    }
  } catch {
    hour = new Date().getHours();
  }

  if (hour >= 5 && hour < 12) {
    return { scene: "morning", greeting: "Good morning" };
  }
  if (hour >= 12 && hour < 18) {
    return { scene: "afternoon", greeting: "Good afternoon" };
  }
  return { scene: "evening", greeting: "Good evening" };
}

export default async function HomePage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { supabase, user, profile } = await requireProfile();

  const isDev = process.env.NODE_ENV !== "production";
  const resolvedParams = props.searchParams ? await props.searchParams : undefined;
  const rawScene = isDev ? resolvedParams?.scene : null;
  const sceneOverride =
    rawScene === "morning" ||
    rawScene === "afternoon" ||
    rawScene === "evening" ||
    rawScene === "night"
      ? (rawScene === "night" ? "evening" : (rawScene as "morning" | "afternoon" | "evening"))
      : null;

  const serverScene = computeServerScene(profile?.timezone);

  // Compute past 7 dates for week activity
  const now = new Date();
  const pastDates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    pastDates.push(d.toISOString().slice(0, 10));
  }

  // Run all primary queries in parallel
  const [
    streakData,
    mineRes,
    updRes,
    allEventsRes,
    heatmapRes,
    actRowsRes,
    lastAttRes,
  ] = await Promise.all([
    getStreakSummary(user.id).catch(() => null),
    supabase
      .from("library_entries")
      .select("role, added_at, cover, pinned, subjects(id, name, description, owner_id, cover)")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false }),
    supabase.rpc("subjects_with_updates"),
    listUserCalendarEvents(user.id, { status: "todo" }).catch(() => []),
    getUserActivityHeatmap(user.id, 20).catch(() => []),
    supabase
      .from("activity_days")
      .select("activity_date, qualifies_for_streak")
      .eq("user_id", user.id)
      .in("activity_date", pastDates),
    supabase
      .from("attempts")
      .select("quiz_id, created_at, quizzes(id, title, subject_id, subjects(id, name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r, () => ({ data: null })),
  ]);

  if (mineRes.error) {
    throw new Error(`Failed to load subjects: ${mineRes.error.message}`);
  }
  const memberships = (mineRes.data ?? []) as any[];

  const subjectIds = memberships
    .map((m) => (m.subjects as unknown as { id: string })?.id)
    .filter(Boolean);

  // Counts of members per subject
  const memberCounts = new Map<string, number>();
  if (subjectIds.length) {
    const { data: all, error: allErr } = await supabase
      .from("library_entries")
      .select("subject_id")
      .in("subject_id", subjectIds);

    if (allErr) {
      throw new Error(`Failed to query member counts: ${allErr.message}`);
    }
    for (const r of all ?? []) {
      memberCounts.set(r.subject_id, (memberCounts.get(r.subject_id) ?? 0) + 1);
    }
  }

  // Updates per subject
  const newCounts = new Map<string, number>();
  if (Array.isArray(updRes.data)) {
    for (const u of updRes.data as { subject_id: string; total: number }[]) {
      newCounts.set(u.subject_id, Number(u.total) || 0);
    }
  }

  const subjects: LibrarySubjectItem[] = memberships.map((m) => {
    const s = m.subjects as unknown as {
      id: string;
      name: string;
      description: string | null;
      owner_id: string;
      cover?: string | null;
    };
    return {
      id: s.id,
      name: s.name,
      description: s.description ?? null,
      owner_id: s.owner_id,
      role: (m.role as "owner" | "editor" | "viewer") ?? "viewer",
      cover: m.cover ?? s.cover ?? null,
      pinned: Boolean(m.pinned),
      memberCount: memberCounts.get(s.id) ?? 1,
      newCount: newCounts.get(s.id) ?? 0,
      addedAt: m.added_at,
    };
  });

  // 1. Resolve Last Studied Item
  let lastStudied: LastStudiedItem | null = null;
  const lastAtt = lastAttRes?.data;
  if (lastAtt && (lastAtt as any).quizzes) {
    const q = (lastAtt as any).quizzes;
    const s = q.subjects;
    lastStudied = {
      kind: "quiz",
      id: q.id,
      title: q.title,
      subjectId: q.subject_id,
      subjectName: s?.name || "Subject",
    };
  } else if (subjectIds.length > 0) {
    const { data: recentDeck } = await supabase
      .from("decks")
      .select("id, title, subject_id, subjects(id, name)")
      .in("subject_id", subjectIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r, () => ({ data: null }));

    if (recentDeck) {
      const s = (recentDeck as any).subjects;
      lastStudied = {
        kind: "deck",
        id: recentDeck.id,
        title: recentDeck.title,
        subjectId: recentDeck.subject_id,
        subjectName: s?.name || "Subject",
      };
    }
  }

  // 2. Resolve This Week's 7-Day Activity
  const qualifiedMap = new Map<string, boolean>();
  (actRowsRes?.data ?? []).forEach((r: any) => {
    qualifiedMap.set(r.activity_date, Boolean(r.qualifies_for_streak));
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const thisWeek: WeekDayActivity[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const isToday = i === 0;
    thisWeek.push({
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate(),
      dateStr,
      isToday,
      isFuture: false,
      qualified: qualifiedMap.get(dateStr) ?? (isToday ? Boolean(streakData?.todayQualified) : false),
    });
  }

  // 3. Resolve Upcoming Calendar Deadlines
  const todayStr = now.toISOString().slice(0, 10);
  const upcomingEvents: CalendarEvent[] = (allEventsRes ?? []).filter(
    (e: CalendarEvent) => e.due_date && e.due_date >= todayStr
  );

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      <HomeClient
        username={profile.username}
        streak={streakData}
        subjects={subjects}
        lastStudied={lastStudied}
        thisWeek={thisWeek}
        upcomingEvents={upcomingEvents}
        heatmap={heatmapRes ?? []}
        initialScene={sceneOverride ?? serverScene.scene}
        initialGreeting={
          sceneOverride === "morning"
            ? "Good morning"
            : sceneOverride === "afternoon"
            ? "Good afternoon"
            : sceneOverride === "evening" || sceneOverride === "night"
            ? "Good evening"
            : serverScene.greeting
        }
        sceneOverride={sceneOverride}
      />
    </div>
  );
}
