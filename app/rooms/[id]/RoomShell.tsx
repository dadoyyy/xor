import RoomChrome from "./RoomChrome";

/** Room frame (kept as a thin wrapper so the layout stays a server component). */
export default function RoomShell(props: {
  roomId: string;
  name: string;
  description: string | null;
  isOwner: boolean;
  username: string;
  children: React.ReactNode;
}) {
  return <RoomChrome {...props} />;
}
