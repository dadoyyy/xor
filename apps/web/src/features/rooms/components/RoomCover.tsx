import SubjectCover, { type SubjectCoverProps } from "@/features/subjects/components/SubjectCover";

export type { SubjectCoverProps };

/**
 * Backward-compatible RoomCover component wrapping SubjectCover
 */
export default function RoomCover(props: SubjectCoverProps) {
  return <SubjectCover {...props} />;
}
