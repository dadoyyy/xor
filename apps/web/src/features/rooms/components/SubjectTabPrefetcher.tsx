"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SubjectTabPrefetcher({ subjectId }: { subjectId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!subjectId) return;
    const tabRoutes = [
      `/subjects/${subjectId}`,
      `/subjects/${subjectId}/flashcards`,
      `/subjects/${subjectId}/quizzes`,
      `/subjects/${subjectId}/leaderboard`,
      `/subjects/${subjectId}/sharing`,
    ];
    for (const route of tabRoutes) {
      router.prefetch(route);
    }
  }, [router, subjectId]);

  return null;
}

