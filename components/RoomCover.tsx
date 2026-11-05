import { coverStyle, getCover } from "@/lib/covers";

/** The decorative banner on a room card: just the chosen pattern. */
export default function RoomCover({
  cover,
  roomId,
  className = "",
}: {
  cover: string | null | undefined;
  roomId: string;
  name?: string;
  className?: string;
  big?: boolean;
}) {
  const c = getCover(cover, roomId);
  return <div className={`relative overflow-hidden rounded-2xl ${className}`} style={coverStyle(c)} aria-hidden />;
}
