import { ContentSkeleton } from "@/components/Skeletons";

// Shown inside the room (sidebar stays) while a tab's content loads.
export default function Loading() {
  return <ContentSkeleton />;
}
