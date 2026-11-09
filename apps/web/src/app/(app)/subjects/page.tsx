import { requireProfile } from "@/services/authService";
import LibraryClient, { type LibrarySubjectItem } from "@/features/rooms/components/LibraryClient";

export const metadata = { title: "xor" };

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; tab?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const { supabase, user } = await requireProfile();

  // Fetch subjects and updates in parallel
  const [mineRes, updRes] = await Promise.all([
    supabase
      .from("library_entries")
      .select("role, added_at, cover, pinned, subjects(id, name, description, owner_id, cover)")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false }),
    supabase.rpc("subjects_with_updates"),
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

  return (
    <main className="page-x mx-auto max-w-6xl w-full pb-20 pt-6 lg:pt-8">
      <LibraryClient
        subjects={subjects}
        meId={user.id}
        coversEnabled={true}
        initialSearch={sp?.search ?? ""}
        initialTab={(sp?.tab as any) ?? "all"}
      />
    </main>
  );
}
