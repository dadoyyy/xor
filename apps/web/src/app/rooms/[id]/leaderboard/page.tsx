import { redirect } from "next/navigation";

export default async function RoomLeaderboardRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/subjects/${id}/leaderboard`);
}
