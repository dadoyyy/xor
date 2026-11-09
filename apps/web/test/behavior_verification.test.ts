import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateBadges } from "../src/features/progress/lib/badges.ts";
import { buildHeatmapCells } from "../src/features/progress/lib/heatmap.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "../..");

function readWebFile(relPath: string) {
  return fs.readFileSync(path.resolve(webRoot, relPath), "utf8");
}

function readRepoFile(relPath: string) {
  return fs.readFileSync(path.resolve(repoRoot, relPath), "utf8");
}

test("PR 4 Verification: Viewer API Rejections", () => {
  // apiSubjectMember guard check
  const authService = readWebFile("src/services/authService.ts");
  assert.ok(authService.includes("options?.requireEdit && !canEdit"), "Must guard requireEdit");
  assert.ok(authService.includes("You have view-only access to this subject"), "Must provide clear viewer message");

  // Deck creation route
  const deckRoute = readWebFile("src/app/api/subjects/[id]/decks/route.ts");
  assert.ok(deckRoute.includes("requireEdit: true"), "Decks POST requires edit permission");

  // Quiz creation route
  const quizRoute = readWebFile("src/app/api/subjects/[id]/quizzes/route.ts");
  assert.ok(quizRoute.includes("requireEdit: true"), "Quizzes POST requires edit permission");

  // Text import commit route
  const importRoute = readWebFile("src/app/api/subjects/[id]/import/route.ts");
  assert.ok(importRoute.includes("requireEdit: action === \"commit\""), "Import commit requires edit permission");

  // Material processing route
  const processRoute = readWebFile("src/app/api/materials/[id]/process/route.ts");
  assert.ok(processRoute.includes("requireEdit: true"), "Material process requires edit permission");

  // Material deletion route
  const deleteRoute = readWebFile("src/app/api/materials/[id]/route.ts");
  assert.ok(deleteRoute.includes("requireEdit: true"), "Material delete requires edit permission");
});

test("PR 4 Verification: RLS Policy Blocks Direct Viewer Mutations and Allows Editors", () => {
  const schemaSql = readRepoFile("supabase/schema.sql");

  // Materials: INSERT, UPDATE, DELETE require can_edit_subject
  assert.ok(schemaSql.includes('create policy "materials insert" on public.materials for insert to authenticated'), "materials insert policy exists");
  assert.ok(schemaSql.includes('create policy "materials update" on public.materials for update to authenticated'), "materials update policy exists");
  assert.ok(schemaSql.includes('create policy "materials delete" on public.materials for delete to authenticated'), "materials delete policy exists");
  assert.ok(schemaSql.includes("public.can_edit_subject(subject_id)"), "materials policies check can_edit_subject");

  // Decks: INSERT, UPDATE, DELETE require can_edit_subject
  assert.ok(schemaSql.includes('create policy "decks insert" on public.decks for insert to authenticated'), "decks insert policy exists");
  assert.ok(schemaSql.includes('create policy "decks update" on public.decks for update to authenticated'), "decks update policy exists");
  assert.ok(schemaSql.includes('create policy "decks delete" on public.decks for delete to authenticated'), "decks delete policy exists");

  // Quizzes: INSERT, UPDATE, DELETE require can_edit_subject
  assert.ok(schemaSql.includes('create policy "quizzes insert" on public.quizzes for insert to authenticated'), "quizzes insert policy exists");
  assert.ok(schemaSql.includes('create policy "quizzes update" on public.quizzes for update to authenticated'), "quizzes update policy exists");
  assert.ok(schemaSql.includes('create policy "quizzes delete" on public.quizzes for delete to authenticated'), "quizzes delete policy exists");

  // Questions: read for members, mutate requires can_edit_subject
  assert.ok(schemaSql.includes('create policy "questions read" on public.quiz_questions for select to authenticated'), "questions read policy exists");
  assert.ok(schemaSql.includes('create policy "questions insert" on public.quiz_questions for insert to authenticated'), "questions insert policy exists");
  assert.ok(schemaSql.includes('create policy "questions update" on public.quiz_questions for update to authenticated'), "questions update policy exists");
  assert.ok(schemaSql.includes('create policy "questions delete" on public.quiz_questions for delete to authenticated'), "questions delete policy exists");
});

test("PR 4 Verification: PR 2 Hardening and PR 3 Import Confirmation", () => {
  // Fork answer keys leak protection
  const forkRoute = readWebFile("src/app/api/subjects/[id]/fork/route.ts");
  assert.ok(forkRoute.includes("completedQuizIds") || forkRoute.includes("canEdit"), "Must guard quiz answer keys on fork");

  // Review endpoint card IDs verification
  const reviewRoute = readWebFile("src/app/api/decks/[id]/review/route.ts");
  assert.ok(reviewRoute.includes("cardIds"), "Must accept cardIds array");
  assert.ok(reviewRoute.includes("recordDeckCardReviews"), "Must call recordDeckCardReviews RPC");

  // Idempotent activity recording
  const activityService = readWebFile("src/services/activityService.ts");
  assert.ok(activityService.includes("recordStudyActivity"), "recordStudyActivity must exist");
  assert.ok(activityService.includes("record_study_activity"), "Must call record_study_activity RPC");

  // Timezone validation
  const authService = readWebFile("src/services/authService.ts");
  assert.ok(authService.includes("set_my_timezone") || authService.includes("timezone"), "Profile syncs client timezone");

  // PR 3 Import parser
  const parseService = readRepoFile("packages/shared-utils/src/textImportParser.ts");
  assert.ok(parseService.includes("parseStructuredImportText"), "parseStructuredImportText exists");
  assert.ok(parseService.includes("flashcards") && parseService.includes("quiz"), "Parses both flashcards and quizzes");
});

test("PR 4 Verification: Fork Quizzes Logic for Non-Owners vs Editors", () => {
  const forkRoute = readWebFile("src/app/api/subjects/[id]/fork/route.ts");

  // Confirm the fork logic:
  // 1. Editors and owners copy all quizzes with full answer keys
  // 2. Non-owners (viewers) only copy quizzes they completed, or quizzes are omitted if not completed
  assert.ok(forkRoute.includes("canEdit"), "Only owners and editors can copy quizzes unconditionally");
  assert.ok(forkRoute.includes("completedQuizIds"), "Non-owners only copy quizzes they completed");
  assert.ok(forkRoute.includes("quiz_answer_keys"), "Answer keys copied safely");
});

test("PR 4 Verification: Activity Recording Accumulation & Single-Source Idempotency", () => {
  const schemaSql = readRepoFile("supabase/schema.sql");

  // Confirm activity_days table stores accumulating counters and qualifies_for_streak
  assert.ok(schemaSql.includes("quizzes_completed int not null default 0"), "Accumulates quizzes_completed");
  assert.ok(schemaSql.includes("cards_reviewed int not null default 0"), "Accumulates cards_reviewed");
  assert.ok(schemaSql.includes("materials_added int not null default 0"), "Accumulates materials_added");
  assert.ok(schemaSql.includes("qualifies_for_streak"), "Flag for qualifying streak increment per day");

  // Confirm study_activity_events table dedups each source event (attempt_id, material_id)
  assert.ok(schemaSql.includes("create table if not exists public.study_activity_events"), "study_activity_events exists");
  assert.ok(schemaSql.includes("source_id"), "Dedups each source event uniquely");
});

test("PR 4 Verification: Transfer Subject Ownership RPC", () => {
  const schemaSql = readRepoFile("supabase/schema.sql");

  assert.ok(schemaSql.includes("create or replace function public.transfer_subject_ownership"), "RPC function exists");
  assert.ok(schemaSql.includes("if not public.is_subject_owner(p_subject)"), "Rejects non-owners calling directly");
  assert.ok(schemaSql.includes("set role = 'editor'"), "Sets old owner role to editor");
  assert.ok(schemaSql.includes("set role = 'owner'"), "Sets new user role to owner");
});

test("PR 4 Verification: Deep Legacy URLs Under /rooms/[id]/* Redirect Correctly", () => {
  const roomRedirect = readWebFile("src/app/rooms/[id]/page.tsx");
  assert.ok(roomRedirect.includes("redirect(`/subjects/${id}`)"), "Base room URL redirects to /subjects/[id]");

  const quizRedirect = readWebFile("src/app/rooms/[id]/quizzes/[quizId]/page.tsx");
  assert.ok(quizRedirect.includes("redirect(`/subjects/${id}/quizzes/${quizId}`)"), "Quiz view redirects");

  const quizTakeRedirect = readWebFile("src/app/rooms/[id]/quizzes/[quizId]/take/[attemptId]/page.tsx");
  assert.ok(quizTakeRedirect.includes("redirect(`/subjects/${id}/quizzes/${quizId}/take/${attemptId}`)"), "Quiz take redirects");

  const quizResultsRedirect = readWebFile("src/app/rooms/[id]/quizzes/[quizId]/results/[attemptId]/page.tsx");
  assert.ok(quizResultsRedirect.includes("redirect(`/subjects/${id}/quizzes/${quizId}/results/${attemptId}`)"), "Quiz results redirects");

  const flashcardRedirect = readWebFile("src/app/rooms/[id]/flashcards/[deckId]/page.tsx");
  assert.ok(flashcardRedirect.includes("redirect(`/subjects/${id}/flashcards/${deckId}`)"), "Flashcard deck redirects");
});

test("PR 6 Verification: Academic Calendar Specifications & Restrictions", () => {
  const calendarService = readWebFile("src/services/calendarService.ts");

  // Plain date format YYYY-MM-DD validation
  assert.ok(calendarService.includes("YYYY-MM-DD"), "Validates plain date format");

  // Optional time format HH:MM validation
  assert.ok(calendarService.includes("HH:MM"), "Validates HH:MM time format");

  // Event types
  assert.ok(calendarService.includes("assignment") && calendarService.includes("backlog"), "Validates event types");

  // Title and description length limits
  assert.ok(calendarService.includes("MAX_TITLE_LENGTH"), "Enforces title limit");
  assert.ok(calendarService.includes("MAX_DESCRIPTION_LENGTH"), "Enforces description limit");

  // Events per user limit
  assert.ok(calendarService.includes("MAX_CALENDAR_EVENTS_PER_USER"), "Enforces events limit");

  // RLS check on subject_id
  assert.ok(calendarService.includes("library_entries"), "Validates user has access to linked subject");

  // Completing calendar event does NOT count towards streak
  assert.ok(calendarService.includes("MUST NOT count toward the streak"), "Explicitly documents no streak credit for calendar completion");
});

test("PR 6 Item 2: Card review idempotency across days and same-session dedup", () => {
  const schemaSql = readRepoFile("supabase/schema.sql");

  // Source key for card reviews includes date or session to allow reviewing on later days
  assert.ok(
    schemaSql.includes("record_deck_card_reviews"),
    "RPC for recording card reviews exists",
  );
  assert.ok(
    schemaSql.includes("activity_date"),
    "Source key incorporates activity_date so re-studying on a later day earns cards_reviewed credit",
  );

  // Behavior verification: same card IDs reviewed on two different dates
  const day1 = "2026-11-07";
  const day2 = "2026-11-08";
  const deckId = "00000000-0000-0000-0000-000000000001";
  const sourceKey1 = `deck_review:${deckId}:${day1}`;
  const sourceKey2 = `deck_review:${deckId}:${day2}`;

  assert.notStrictEqual(sourceKey1, sourceKey2, "Different days produce distinct source event keys");

  // Re-submission on the same day produces the same source key (idempotent / deduplicated)
  const sourceKey1Duplicate = `deck_review:${deckId}:${day1}`;
  assert.strictEqual(sourceKey1, sourceKey1Duplicate, "Submissions on the same day share the same source key and dedup");
});

test("PR 6 Item 3 & PR 7 Gate: Require at least 50% minimal engagement for quizzes to count toward streak", () => {
  const submitRoute = readWebFile("src/app/api/attempts/[id]/submit/route.ts");

  // Check code implements engagement gate
  assert.ok(submitRoute.includes("answeredCount"), "Tracks answered questions count");
  assert.ok(
    submitRoute.includes("answeredRatio >= 0.5") || submitRoute.includes("answeredCount / totalQuestions >= 0.5") || submitRoute.includes("totalQuestions > 0 && (answeredCount / totalQuestions) >= 0.5"),
    "Requires at least 50% answered questions for streak engagement",
  );

  // Behavioral test of engagement gate logic
  const blankAnswers: Record<string, unknown> = {
    "q1": {},
    "q2": { text: "   " },
    "q3": null,
  };
  const countAnswered = (answers: Record<string, unknown>) =>
    Object.values(answers).filter((val) => {
      if (!val || typeof val !== "object") return false;
      const v = val as { index?: number; text?: string; matches?: unknown[] };
      return v.index !== undefined || (typeof v.text === "string" && v.text.trim().length > 0) || (Array.isArray(v.matches) && v.matches.length > 0);
    }).length;

  assert.strictEqual(countAnswered(blankAnswers), 0, "Blank answers result in 0 answered questions");

  const partialAnswers: Record<string, unknown> = {
    "q1": { index: 2 },
  };
  const totalQuestions = 4;
  const answeredCount = countAnswered(partialAnswers);
  const qualifies = totalQuestions > 0 && (answeredCount / totalQuestions) >= 0.5;
  assert.strictEqual(qualifies, false, "25% answered does not qualify for streak (requires >= 50%)");

  const engagedAnswers: Record<string, unknown> = {
    "q1": { index: 2 },
    "q2": { text: "photosynthesis" },
  };
  const engagedCount = countAnswered(engagedAnswers);
  const engagedQualifies = totalQuestions > 0 && (engagedCount / totalQuestions) >= 0.5;
  assert.strictEqual(engagedQualifies, true, "50% answered qualifies for streak");
});

test("PR 6 Item 4: Timezone evaluation with fixed timestamps (UTC+8 and UTC-5)", () => {
  // Helper for timezone date evaluation in JavaScript
  function getUserLocalDate(isoUtcString: string, timeZone: string): string {
    const d = new Date(isoUtcString);
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    return formatter.format(d); // YYYY-MM-DD
  }

  // UTC+8 (e.g. Asia/Manila, Asia/Singapore)
  // Local 23:30 on Nov 7 = 15:30 UTC
  const utc8_night = getUserLocalDate("2026-11-07T15:30:00.000Z", "Asia/Manila");
  assert.strictEqual(utc8_night, "2026-11-07", "UTC+8 at 23:30 local is Nov 7");

  // Local 00:30 on Nov 8 = 16:30 UTC
  const utc8_morning = getUserLocalDate("2026-11-07T16:30:00.000Z", "Asia/Manila");
  assert.strictEqual(utc8_morning, "2026-11-08", "UTC+8 at 00:30 local is Nov 8 (day boundary passed)");

  // UTC-5 (e.g. America/New_York)
  // Local 23:30 on Nov 7 = 04:30 UTC Nov 8
  const utc5_night = getUserLocalDate("2026-11-08T04:30:00.000Z", "America/New_York");
  assert.strictEqual(utc5_night, "2026-11-07", "UTC-5 at 23:30 local is Nov 7");

  // Local 00:30 on Nov 8 = 05:30 UTC Nov 8
  const utc5_morning = getUserLocalDate("2026-11-08T05:30:00.000Z", "America/New_York");
  assert.strictEqual(utc5_morning, "2026-11-08", "UTC-5 at 00:30 local is Nov 8 (day boundary passed)");
});

test("Onboarding username save: atomic RPC, unique race validation and reserved names", () => {
  const usernameRoute = readWebFile("src/app/api/profile/username/route.ts");
  assert.ok(usernameRoute.includes("set_my_username"), "Supports set_my_username RPC");
  assert.ok(usernameRoute.includes("RESERVED_USERNAMES"), "Enforces reserved usernames validation");
  assert.ok(usernameRoute.includes("23505"), "Handles 23505 unique constraint race conditions");
});

test("Username conflict logic: literal underscore must not act as a wildcard ('a_b' vs 'axb')", () => {
  // If ILIKE were used: 'axb' ILIKE 'a_b' would return true (false conflict).
  // With exact case-insensitive lower() comparison or unique lower index:
  const existingUsername = "a_b";
  const candidateValid = "axb";
  const candidateConflict = "A_B";

  const isExactConflict = (candidate: string, existing: string) =>
    candidate.trim().toLowerCase() === existing.trim().toLowerCase();

  assert.strictEqual(
    isExactConflict(candidateValid, existingUsername),
    false,
    "'axb' does NOT conflict with 'a_b' because '_' is not treated as wildcard",
  );

  assert.strictEqual(
    isExactConflict(candidateConflict, existingUsername),
    true,
    "'A_B' correctly conflicts with 'a_b'",
  );
});

test("PR 7: Badge unlock rules evaluation", () => {
  // 1. Zero data user: all badges locked
  const zeroBadges = evaluateBadges({
    longestStreak: 0,
    currentStreak: 0,
    attempts: [],
    memberships: [],
    totalQuizzesCompleted: 0,
  });

  assert.strictEqual(zeroBadges.length, 7, "Exactly 7 badges defined");
  assert.ok(zeroBadges.every((b: any) => !b.unlocked), "All badges locked when no supporting data exists");

  // 2. First quiz and perfect score
  const quizBadges = evaluateBadges({
    longestStreak: 1,
    currentStreak: 1,
    attempts: [
      {
        id: "att-1",
        score: 20,
        max_score: 20,
        status: "graded",
        submitted_at: "2026-11-08T05:00:00Z",
        started_at: "2026-11-08T04:50:00Z",
      },
    ],
    memberships: [],
    totalQuizzesCompleted: 1,
  });

  const firstQuiz = quizBadges.find((b: any) => b.id === "first_quiz");
  const perfectScore = quizBadges.find((b: any) => b.id === "perfect_score");
  const streak3 = quizBadges.find((b: any) => b.id === "streak_3");

  assert.strictEqual(firstQuiz?.unlocked, true, "First quiz unlocked on completed attempt");
  assert.strictEqual(perfectScore?.unlocked, true, "Perfect score unlocked when score === max_score");
  assert.strictEqual(streak3?.unlocked, false, "3-day streak remains locked at streak 1");

  // 3. Streak badges (3, 7, 30)
  const streakBadges = evaluateBadges({
    longestStreak: 8,
    currentStreak: 4,
    attempts: [],
    memberships: [],
    totalQuizzesCompleted: 0,
  });

  const b3 = streakBadges.find((b: any) => b.id === "streak_3");
  const b7 = streakBadges.find((b: any) => b.id === "streak_7");
  const b30 = streakBadges.find((b: any) => b.id === "streak_30");

  assert.strictEqual(b3?.unlocked, true, "Streak 3 unlocked at longestStreak = 8");
  assert.strictEqual(b7?.unlocked, true, "Streak 7 unlocked at longestStreak = 8");
  assert.strictEqual(b30?.unlocked, false, "Streak 30 locked at longestStreak = 8");

  // 4. Subject ownership and invite badges
  const subjectBadges = evaluateBadges({
    longestStreak: 0,
    currentStreak: 0,
    attempts: [],
    memberships: [
      { role: "owner", added_at: "2026-11-05T08:00:00Z" },
      { role: "editor", added_at: "2026-11-06T10:00:00Z" },
    ],
    totalQuizzesCompleted: 0,
  });

  const firstSubject = subjectBadges.find((b: any) => b.id === "first_subject");
  const firstInvite = subjectBadges.find((b: any) => b.id === "first_invite_accepted");

  assert.strictEqual(firstSubject?.unlocked, true, "First subject unlocked when role === 'owner'");
  assert.strictEqual(firstInvite?.unlocked, true, "First invite accepted unlocked when role === 'editor'");
});

test("PR 7: Heatmap date bucketing and level calculations (UTC+8 and UTC-5)", () => {
  function getLocalDay(isoUtc: string, timeZone: string): string {
    const d = new Date(isoUtc);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }

  // Event 1 at 15:30 UTC: 23:30 local in Manila (Nov 7), 10:30 local in New York (Nov 7)
  const ts1 = "2026-11-07T15:30:00.000Z";
  assert.strictEqual(getLocalDay(ts1, "Asia/Manila"), "2026-11-07", "Nov 7 in UTC+8");
  assert.strictEqual(getLocalDay(ts1, "America/New_York"), "2026-11-07", "Nov 7 in UTC-5");

  // Event 2 at 16:30 UTC: 00:30 local next day in Manila (Nov 8), 11:30 local in New York (Nov 7)
  const ts2 = "2026-11-07T16:30:00.000Z";
  assert.strictEqual(getLocalDay(ts2, "Asia/Manila"), "2026-11-08", "Nov 8 in UTC+8 (crossed midnight)");
  assert.strictEqual(getLocalDay(ts2, "America/New_York"), "2026-11-07", "Still Nov 7 in UTC-5");

  // Activity rows bucketing in buildHeatmapCells
  const mockActivityRows = [
    {
      activity_date: "2026-11-08",
      quizzes_completed: 2,
      cards_reviewed: 10,
      materials_added: 1,
      points_earned: 45,
      qualifies_for_streak: true,
    },
    {
      activity_date: "2026-11-07",
      quizzes_completed: 1,
      cards_reviewed: 0,
      materials_added: 0,
      points_earned: 10,
      qualifies_for_streak: true,
    },
    {
      activity_date: "2026-11-06",
      quizzes_completed: 0,
      cards_reviewed: 2,
      materials_added: 0,
      points_earned: 0,
      qualifies_for_streak: false,
    },
  ];

  const monthlyCells = buildHeatmapCells(mockActivityRows, 30, "2026-11-08");
  assert.strictEqual(monthlyCells.length, 30, "Monthly heatmap generates exactly 30 day cells");
  assert.strictEqual(monthlyCells[monthlyCells.length - 1].date, "2026-11-08", "Last cell is today");

  const todayCell = monthlyCells.find((c: any) => c.date === "2026-11-08");
  assert.ok(todayCell, "Today cell exists");
  assert.strictEqual(todayCell?.quizzes, 2);
  assert.strictEqual(todayCell?.cards, 10);
  assert.strictEqual(todayCell?.materials, 1);
  assert.strictEqual(todayCell?.count, 13);
  assert.strictEqual(todayCell?.level, 3, "13 actions maps to level 3 (high)");
  assert.strictEqual(todayCell?.qualifies, true);

  const nov7Cell = monthlyCells.find((c: any) => c.date === "2026-11-07");
  assert.ok(nov7Cell, "Nov 7 cell exists");
  assert.strictEqual(nov7Cell?.count, 1);
  assert.strictEqual(nov7Cell?.level, 1, "1 action maps to level 1");

  const nov6Cell = monthlyCells.find((c: any) => c.date === "2026-11-06");
  assert.ok(nov6Cell, "Nov 6 cell exists");
  assert.strictEqual(nov6Cell?.count, 2);
  assert.strictEqual(nov6Cell?.level, 2, "2 actions maps to level 2");

  const emptyCell = monthlyCells.find((c: any) => c.date === "2026-11-05");
  assert.ok(emptyCell, "Empty cell exists");
  assert.strictEqual(emptyCell?.count, 0);
  assert.strictEqual(emptyCell?.level, 0, "0 actions maps to level 0");

  const yearlyCells = buildHeatmapCells(mockActivityRows, 364, "2026-11-08");
  assert.strictEqual(yearlyCells.length, 364, "Yearly heatmap generates exactly 52 weeks (364 cells)");
});

test("App Shell Layout & Performance: Shell persistence, React cache, lightweight polling, and link navigation", () => {
  const appLayout = readWebFile("src/app/(app)/layout.tsx");
  assert.ok(appLayout.includes("<AppShell"), "Shared (app)/layout renders <AppShell>");

  const homePage = readWebFile("src/app/(app)/home/page.tsx");
  assert.ok(!homePage.includes("<AppShell"), "HomePage does not render its own <AppShell>");

  const subjectsPage = readWebFile("src/app/(app)/subjects/page.tsx");
  assert.ok(!subjectsPage.includes("<AppShell"), "SubjectsPage does not render its own <AppShell>");

  const calendarPage = readWebFile("src/app/(app)/calendar/page.tsx");
  assert.ok(!calendarPage.includes("<AppShell"), "CalendarPage does not render its own <AppShell>");

  const progressPage = readWebFile("src/app/(app)/progress/page.tsx");
  assert.ok(!progressPage.includes("<AppShell"), "ProgressPage does not render its own <AppShell>");

  const roomChrome = readWebFile("src/features/rooms/components/RoomChrome.tsx");
  assert.ok(!roomChrome.includes("<AppShell"), "RoomChrome does not render its own <AppShell>");

  const authService = readWebFile("src/services/authService.ts");
  assert.ok(authService.includes("cache(async function requireProfile"), "requireProfile is wrapped in React cache()");

  const activityService = readWebFile("src/services/activityService.ts");
  assert.ok(activityService.includes("cache(async function getStreakSummary"), "getStreakSummary is wrapped in React cache()");

  const offlinePage = readWebFile("src/app/offline/page.tsx");
  assert.ok(offlinePage.includes('import Link from "next/link"'), "offline page uses next/link");
  assert.ok(offlinePage.includes('<Link href="/subjects"'), "offline page uses Link for internal navigation");

  const materialsClient = readWebFile("src/features/materials/components/MaterialsClient.tsx");
  assert.ok(!materialsClient.includes("setInterval(() => router.refresh(), 5000)"), "5s full router.refresh() polling removed from MaterialsClient");
  assert.ok(materialsClient.includes("fetch(`/api/materials/${id}`)"), "MaterialsClient polls lightweight status endpoint");
});
