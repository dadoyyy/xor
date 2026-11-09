export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progressText?: string;
};

export type BadgeInputData = {
  longestStreak: number;
  currentStreak: number;
  attempts: Array<{
    id: string;
    score: number | null;
    max_score: number | null;
    status: string;
    submitted_at: string | null;
    started_at: string;
  }>;
  memberships: Array<{
    role: string;
    added_at: string;
  }>;
  totalQuizzesCompleted: number;
};

export function evaluateBadges(data: BadgeInputData): BadgeDefinition[] {
  const { longestStreak, attempts, memberships, totalQuizzesCompleted } = data;

  // 1. First Quiz
  const gradedAttempts = attempts.filter((a) => a.status === "graded");
  const firstGraded = gradedAttempts.sort(
    (a, b) => new Date(a.submitted_at || a.started_at).getTime() - new Date(b.submitted_at || b.started_at).getTime(),
  )[0];
  const firstQuizUnlocked = totalQuizzesCompleted > 0 || gradedAttempts.length > 0;

  // 2. Perfect Score (100% on any completed quiz attempt with max_score > 0)
  const perfectAttempt = gradedAttempts.find(
    (a) => a.score != null && a.max_score != null && a.max_score > 0 && Number(a.score) === Number(a.max_score),
  );

  // 3. First Subject Created (user is owner of >= 1 subject)
  const ownedSubject = memberships.find((m) => m.role === "owner");

  // 4. First Invite Accepted (user joined a subject as non-owner)
  const joinedSubject = memberships.find((m) => m.role === "editor" || m.role === "viewer" || m.role === "member");

  return [
    {
      id: "first_quiz",
      name: "First Quiz",
      description: "Complete your first quiz study session.",
      icon: "/mascot/badges/flashcard-master.png",
      unlocked: Boolean(firstQuizUnlocked),
      unlockedAt: firstGraded?.submitted_at || firstGraded?.started_at || null,
      progressText: firstQuizUnlocked ? "Completed" : "0/1 quizzes completed",
    },
    {
      id: "perfect_score",
      name: "Flawless Ace",
      description: "Score a perfect 100% on any quiz.",
      icon: "/mascot/badges/perfect-score.png",
      unlocked: Boolean(perfectAttempt),
      unlockedAt: perfectAttempt?.submitted_at || perfectAttempt?.started_at || null,
      progressText: perfectAttempt ? "Unlocked" : "Score 100% on a quiz",
    },
    {
      id: "streak_3",
      name: "3-Day Flame",
      description: "Maintain a study streak of 3 consecutive days.",
      icon: "/mascot/badges/streak-7.png",
      unlocked: longestStreak >= 3,
      unlockedAt: null,
      progressText: longestStreak >= 3 ? "Achieved" : `${Math.min(longestStreak, 3)}/3 days`,
    },
    {
      id: "streak_7",
      name: "7-Day Dedication",
      description: "Hit a full week streak of daily learning.",
      icon: "/mascot/badges/streak-7.png",
      unlocked: longestStreak >= 7,
      unlockedAt: null,
      progressText: longestStreak >= 7 ? "Achieved" : `${Math.min(longestStreak, 7)}/7 days`,
    },
    {
      id: "streak_30",
      name: "Monthly Master",
      description: "Conquer a monumental 30-day streak.",
      icon: "/mascot/badges/leaderboard-1st.png",
      unlocked: longestStreak >= 30,
      unlockedAt: null,
      progressText: longestStreak >= 30 ? "Achieved" : `${Math.min(longestStreak, 30)}/30 days`,
    },
    {
      id: "first_subject",
      name: "Subject Creator",
      description: "Create your very first study subject.",
      icon: "/mascot/badges/first-room.png",
      unlocked: Boolean(ownedSubject),
      unlockedAt: ownedSubject?.added_at || null,
      progressText: ownedSubject ? "Created" : "Create 1 subject",
    },
    {
      id: "first_invite_accepted",
      name: "Collaborator",
      description: "Join a study subject with an invite share key.",
      icon: "/mascot/badges/joined-room.png",
      unlocked: Boolean(joinedSubject),
      unlockedAt: joinedSubject?.added_at || null,
      progressText: joinedSubject ? "Joined" : "Join 1 subject",
    },
  ];
}

