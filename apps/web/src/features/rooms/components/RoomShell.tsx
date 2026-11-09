import RoomChrome, { type MemberSummary } from "./RoomChrome";

/** Room frame (kept as a thin wrapper so the layout stays a server component). */
export default function RoomShell(props: {
  roomId: string;
  name: string;
  description: string | null;
  isOwner: boolean;
  canEdit?: boolean;
  username: string;
  members?: MemberSummary[];
  shareKey?: string | null;
  children: React.ReactNode;
}) {
  return <RoomChrome {...props} />;
}
