import { requireProfile } from "@/services/authService";
import { getUserProgressData } from "@/services/progressService";
import ProgressClient from "@/features/progress/components/ProgressClient";

export const metadata = {
  title: "xor",
  description: "View your study streak, learning heatmap, badges, and recent quiz attempts.",
};

export default async function ProgressPage() {
  const { user } = await requireProfile();
  const progressData = await getUserProgressData(user.id);

  return (
    <main className="page-x mx-auto max-w-6xl w-full pb-20 pt-8 lg:pt-10">
      <ProgressClient data={progressData} />
    </main>
  );
}
