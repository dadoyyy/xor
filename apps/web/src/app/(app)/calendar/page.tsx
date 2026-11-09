import { requireProfile } from "@/services/authService";
import { CalendarClient } from "@/features/calendar";
import { listUserCalendarEvents } from "@/services/calendarService";
import type { LibrarySubjectItem } from "@/features/rooms/components/LibraryClient";

export const metadata = { title: "xor" };

export default async function CalendarPage() {
  const { supabase, user, profile } = await requireProfile();

  // Fetch subjects and calendar events in parallel
  const [mineRes, eventsRes] = await Promise.all([
    supabase
      .from("library_entries")
      .select("role, added_at, cover, pinned, subjects(id, name, description, owner_id, cover)")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false }),
    listUserCalendarEvents(user.id).catch(() => []),
  ]);

  if (mineRes.error) {
    throw new Error(`Failed to load subjects: ${mineRes.error.message}`);
  }
  const memberships = (mineRes.data ?? []) as any[];

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
      memberCount: 1,
      newCount: 0,
      addedAt: m.added_at,
    };
  });

  return (
    <main className="page-x mx-auto max-w-6xl w-full pb-20 pt-8 lg:pt-10">
      <CalendarClient
        initialEvents={eventsRes ?? []}
        subjects={subjects}
        userTimezone={profile.timezone || "UTC"}
      />
    </main>
  );
}
