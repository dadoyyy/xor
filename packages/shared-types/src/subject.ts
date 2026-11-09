export type SubjectRole = "owner" | "editor" | "viewer";

export type SubjectSection = "materials" | "quizzes" | "flashcards" | "leaderboard" | "sharing";

export type MaterialSourceType = "pdf" | "text";
export type ContentSourceType = "ai" | "import";

export type SubjectSummary = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  share_enabled: boolean;
  allow_fork: boolean;
  forked_from_id: string | null;
  forked_from_name: string | null;
  forked_from_owner_id: string | null;
  leaderboard_epoch: number;
  cover: string | null;
  created_at: string;
  updated_at?: string;
};

export type LibraryEntry = {
  subject_id: string;
  user_id: string;
  role: SubjectRole;
  pinned: boolean;
  cover: string | null;
  added_at: string;
  last_opened_at: string | null;
};

export type SubjectUpdates = {
  materials: number;
  quizzes: number;
  flashcards: number;
  sharing: number;
  members: number;
  hasPoll: boolean;
  total: number;
};

export type ActivityKind = "quiz_completed" | "cards_reviewed" | "material_added";

export type ActivityDay = {
  user_id: string;
  activity_date: string;
  quizzes_completed: number;
  cards_reviewed: number;
  materials_added: number;
  points_earned: number;
  total_actions: number;
  qualifies_for_streak: boolean;
  updated_at: string;
};

export type StreakSummary = {
  timezone: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  todayQualified: boolean;
};

export type CalendarEventType = "assignment" | "project" | "backlog" | "exam";
export type CalendarEventStatus = "todo" | "in_progress" | "done";
export type CalendarEventPriority = "low" | "medium" | "high";

export type CalendarEvent = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  event_type: CalendarEventType;
  status: CalendarEventStatus;
  priority: CalendarEventPriority;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

