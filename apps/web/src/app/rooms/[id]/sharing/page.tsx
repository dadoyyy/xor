import { redirect } from "next/navigation";

export default async function RoomSharingRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/subjects/${id}/sharing`);
}
