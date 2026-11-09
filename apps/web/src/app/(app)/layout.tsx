import { requireProfile } from "@/services/authService";
import { getStreakSummary } from "@/services/activityService";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireProfile();

  let streak = null;
  try {
    streak = await getStreakSummary(user.id);
  } catch {}

  return (
    <AppShell username={profile.username} streak={streak}>
      {children}
    </AppShell>
  );
}

