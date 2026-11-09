# xor Refactor Plan: Room-First to User-First Architecture

> **Status:** Approved with Changes — Executing PR 1  
> **Goal:** Transition **xor** from a room-first collaborative container model to a **user-first personal study workspace** with a personal Dashboard, Academic Calendar, GitHub-style Monthly Activity Heatmap & Streak system (timezone-aware, study-action thresholded), deterministic Text Import Parser (no-AI Q&A / MCQ / Fill-in-Blank), and a Subject Library with link-based sharing (`owner` / `editor` / `viewer`), ownership transfer, and one-click Subject Forking (including physical storage file copy and attribution).

---

## 1. Current Repository Audit

### 1.1 Database Schema & Supabase RPCs (`supabase/schema.sql`, `migrations/002..004.sql`)

| Current Artifact | Type | Current Purpose | Refactor Action | Target / Notes |
| :--- | :--- | :--- | :--- | :--- |
| `public.profiles` | Table | Stores `id`, `username`, `created_at` | **Keep & Extend** | Add `timezone text not null default 'UTC'`, `current_streak int not null default 0`, `longest_streak int not null default 0`, `last_active_date date`. Backfill streak fields during migration from historical qualifying study days. |
| `public.rooms` | Table | Top-level container (`id`, `name`, `description`, `owner_id`, `secret_key`, `leaderboard_epoch`, `cover`, `created_at`) | **Rename & Extend** | Rename to `public.subjects`. Rename `secret_key` → `share_key`. Add `share_enabled boolean not null default true`, `allow_fork boolean not null default true`, `forked_from_id uuid references public.subjects(id) on delete set null`, `forked_from_name text`, `forked_from_owner_id uuid references public.profiles(id) on delete set null`, `updated_at timestamptz not null default now()`. *(No `default_share_role`; joining by key always grants `'viewer'`.)* |
| `public.room_members` | Table | Join table `(room_id, user_id, role ['owner'\|'member'], joined_at, cover)` | **Rename & Extend** | Rename to `public.library_entries`. Rename `room_id` → `subject_id`, `joined_at` → `added_at`. Migrate existing `'member'` → `'editor'`. Expand `role` check to `('owner', 'editor', 'viewer')`. Add `pinned boolean not null default false`, `last_opened_at timestamptz`. |
| `public.materials` | Table | Uploaded PDFs & AI-extracted study notes (`room_id`, `uploaded_by`, `title`, `file_path`, `status`, `content`, `page_count`, etc.) | **Keep & Rename FK** | Rename `room_id` → `subject_id`. Add `source_type text not null default 'pdf' check (source_type in ('pdf', 'text'))` and `forked_from_id uuid references public.materials(id) on delete set null`. |
| `public.decks` | Table | Flashcard deck metadata (`room_id`, `created_by`, `title`, `difficulty`, `material_ids`) | **Keep & Rename FK** | Rename `room_id` → `subject_id`. Add `source_type text not null default 'ai' check (source_type in ('ai', 'import'))`, `forked_from_id uuid references public.decks(id) on delete set null`. |
| `public.cards` | Table | Flashcard items (`deck_id`, `position`, `front`, `back`) | **Keep** | Unchanged; cascades from `decks`. |
| `public.quizzes` | Table | Quiz metadata (`room_id`, `created_by`, `title`, `material_ids`, `question_types`, `difficulty`, `question_count`, `time_limit_minutes`, `max_score`) | **Keep & Rename FK** | Rename `room_id` → `subject_id`. Add `source_type text not null default 'ai' check (source_type in ('ai', 'import'))`, `forked_from_id uuid references public.quizzes(id) on delete set null`. |
| `public.quiz_questions` & `public.quiz_answer_keys` | Tables | Quiz prompts, choices, and server-only answer keys | **Keep & Lock** | Add trigger `trg_lock_quiz_questions_after_counting_attempt` preventing `INSERT`, `UPDATE`, or `DELETE` on `quiz_questions` and `quiz_answer_keys` once a counting (`counts = true`) attempt exists for that `quiz_id` (unless the quiz itself is being cascade-deleted). |
| `public.attempts` | Table | User quiz runs (`quiz_id`, `room_id`, `user_id`, `epoch`, `counts`, `status`, `started_at`, `submitted_at`, `score`, `max_score`) | **Keep & Rename FK** | Rename `room_id` → `subject_id`. Keep `counts boolean` (`true` for first attempt per `(quiz_id, user_id, epoch)`) + partial unique index `attempts_one_counting`. |
| `public.attempt_answers` | Table | Per-question graded responses | **Keep** | Unchanged. |
| `public.reset_polls` & `public.reset_votes` | Tables | Majority-vote leaderboard season reset (`room_id`, `started_by`, `status`, `expires_at`) | **Keep & Rename FK** | Rename `room_id` → `subject_id`. |
| `public.room_seen` | Table | Tracks last-visited timestamp per `(user_id, room_id, section)` for `"New"` badges | **Rename & Update** | Rename to `public.subject_seen` (`room_id` → `subject_id`, section check allows `'materials'`, `'flashcards'`, `'quizzes'`, `'leaderboard'`, `'sharing'`, plus legacy `'members'`). |
| `public.usage_events` & `public.join_failures` | Tables | Daily AI quota tracking and brute-force key rate limiting | **Keep** | Unchanged. |
| `is_room_member` / `is_room_owner` / `shares_room` | SQL Functions | RLS security-definer helpers | **Replace & Alias** | Replace all policies in the same transaction to use `has_subject_access(p_subject)`, `can_edit_subject(p_subject)`, `is_subject_owner(p_subject)`, and `shares_subject(p_user)`. Keep thin SQL function aliases for `is_room_member`, `is_room_owner`, and `shares_room`. |
| Room RPCs | SQL RPCs | `create_room`, `join_room`, `update_room`, `remove_member`, `get_room_key`, `regenerate_room_key`, `set_my_cover`, `room_leaderboard`, `mark_seen`, `room_updates`, `rooms_with_updates` | **Replace & Alias** | Create canonical `subject_*` RPCs (`create_subject`, `add_shared_subject`, `update_subject`, `set_subject_sharing`, `set_member_role`, `transfer_subject_ownership`, `remove_library_entry`, `get_subject_share_key`, `regenerate_subject_share_key`, `set_my_subject_cover`, `subject_leaderboard`, `mark_subject_seen`, `subject_updates`, `subjects_with_updates`, `fork_subject`, `record_study_activity`) and keep thin RPC aliases for the old names. No compatibility views. |
| `storage.objects` (`materials` bucket) | Storage RLS | Checks `is_room_member(((storage.foldername(name))[1])::uuid)` | **Update Policy** | Upload policy checks `can_edit_subject(...)`; download policy checks `has_subject_access(...)`. |

---

### 1.2 Routes, Components, Services, Assets & Shared Packages

| Current Path | Current Role | Action | New Path / Replacement |
| :--- | :--- | :--- | :--- |
| `apps/web/src/app/rooms/page.tsx` | Room grid + join/create bar | **Split** | Split into `/home` (Personal Dashboard) and `/library` (Subject Library). Redirect `/rooms` → `/library`. |
| `apps/web/src/app/rooms/[id]/*` | Room workspace routes | **Rename** | Move to `apps/web/src/app/subjects/[id]/*` (`Materials`, `Flashcards`, `Quizzes`, `Leaderboard`, `Sharing`). Keep `/rooms/[id]/*` as redirects to `/subjects/[id]/*`. |
| *(None — Missing)* | Personal Calendar page | **Create** | `apps/web/src/app/calendar/page.tsx` (`assignment`, `project`, `backlog`, `exam` events). |
| *(None — Missing)* | Personal Progress & Heatmap page | **Create** | `apps/web/src/app/progress/page.tsx` (GitHub-style monthly/yearly activity heatmap, streak stats, Corgi badges, attempt history). |
| *(None — Missing)* | Deterministic Text Import Parser & API | **Create** | `packages/shared-utils/src/textImportParser.ts` + `POST /api/subjects/[id]/import` (parses formatted Q&A flashcards, standalone Multiple Choice, and mixed Multiple Choice + Fill-in-the-Blank sets directly into `decks`/`cards` or `quizzes`/`quiz_questions`/`quiz_answer_keys` **without AI quota consumption**). |
| *(None — Missing)* | Flashcard Review Session Logging API | **Create** | `POST /api/decks/[id]/review` (logs `cards_reviewed` count in user's `profiles.timezone` via `record_study_activity` when a user reviews flashcards in `StudyDeck`). |
| *(None — Missing)* | Subject Fork API (with physical Storage copy) | **Create** | `POST /api/subjects/[id]/fork` (checks `allow_fork = true`, calls `admin.storage.from('materials').copy(...)` for each PDF into `<new_subject_id>/<uuid>.pdf`, then clones DB rows with `forked_from_id`, `forked_from_name`, `forked_from_owner_id`). |
| `packages/api-client/src/index.ts` & `packages/shared-types/src/*` | Shared types & typed API client (used by web & `apps/mobile`) | **Extend (Backwards-Compatible)** | Add `subjects.*`, `calendar.*`, `progress.*`, and `decks.logReview` methods while preserving `rooms.*` aliases so `apps/mobile` and `apps/web` both typecheck continuously. |
| `public/mascot/` & `apps/web/public/mascot/` | Corgi mascot assets | **Organize & Standardize** | Keep canonical mascot assets organized under `apps/web/public/mascot/` (mirrored at `public/mascot/`):<br>• Loader frames: `happy-open`, `happy-blink`, `reading-1..3`, `flashcards-1..3`, `grading-1..3`, `waiting-1..2`<br>• Hero & auth poses: `hero-squad`, `signup-*`<br>• Streak & progress badges: `streak-7`, `streak-30`, `streak-100`, `badge-*` (referenced via `apps/web/src/lib/mascot/`). |

---

## 2. Proposed User-First Data Model

### 2.1 Core Entities & DDL

#### 1. `public.profiles` (Timezone & Streak Metadata)
```sql
alter table public.profiles
  add column if not exists timezone text not null default 'UTC',
  add column if not exists current_streak int not null default 0 check (current_streak >= 0),
  add column if not exists longest_streak int not null default 0 check (longest_streak >= 0),
  add column if not exists last_active_date date;
```
Helper function to resolve any timestamp (defaulting to `now()`) into a user's local calendar `date` using `profiles.timezone` (with safe fallback to `'UTC'` if an invalid IANA timezone string is stored):
```sql
create or replace function public.user_local_date(p_user uuid, p_ts timestamptz default now())
returns date language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text;
begin
  select coalesce(nullif(trim(timezone), ''), 'UTC') into v_tz
  from public.profiles where id = p_user;
  if v_tz is null or not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;
  return (p_ts at time zone v_tz)::date;
end $$;
```

#### 2. `public.subjects` (replaces `public.rooms`)
- Joining by share key **always** grants `'viewer'` (`default_share_role` is omitted). Owners promote members to `'editor'` or transfer `'owner'` manually.
- Includes `allow_fork boolean not null default true` and fork attribution (`forked_from_id`, `forked_from_name`, `forked_from_owner_id`) so forked subjects remain attributed even if the upstream subject is later deleted.
```sql
-- Migrated in-place from public.rooms:
alter table public.rooms rename to subjects;
alter table public.subjects rename column secret_key to share_key;
alter table public.subjects
  add column if not exists share_enabled boolean not null default true,
  add column if not exists allow_fork boolean not null default true,
  add column if not exists forked_from_id uuid references public.subjects (id) on delete set null,
  add column if not exists forked_from_name text,
  add column if not exists forked_from_owner_id uuid references public.profiles (id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists subjects_owner_idx on public.subjects (owner_id, created_at desc);
create index if not exists subjects_forked_from_idx on public.subjects (forked_from_id) where forked_from_id is not null;
```

#### 3. `public.library_entries` (replaces `public.room_members`)
```sql
alter table public.room_members rename to library_entries;
alter table public.library_entries rename column room_id to subject_id;
alter table public.library_entries rename column joined_at to added_at;

-- Existing 'member' rows become 'editor' so current collaborators keep edit access
-- New share-key joiners always receive 'viewer'
alter table public.library_entries
  add column if not exists pinned boolean not null default false,
  add column if not exists last_opened_at timestamptz;

create index if not exists library_entries_user_idx
  on public.library_entries (user_id, pinned desc, added_at desc);
create index if not exists library_entries_subject_role_idx
  on public.library_entries (subject_id, role);
```

#### 4. `public.materials`, `public.decks`, `public.cards`, `public.quizzes`, `public.quiz_questions`, `public.quiz_answer_keys`
- `materials` supports `'pdf'` and `'text'` sources and tracks `forked_from_id`.
- `decks` and `quizzes` support `'ai'` and `'import'` sources (for the deterministic text import parser) and track `forked_from_id`.
- **Quiz Fairness Lock**: Once any counting attempt (`attempts.counts = true`) exists for a quiz, `quiz_questions` and `quiz_answer_keys` for that quiz are locked against `UPDATE`, `DELETE`, or `INSERT` (except when the parent `quiz` row itself is being deleted).
```sql
create or replace function public.quiz_has_counting_attempt(p_quiz uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.attempts
    where quiz_id = p_quiz and counts = true
  );
$$;

create or replace function public.prevent_locked_quiz_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_quiz_id uuid;
begin
  if tg_table_name = 'quiz_questions' then
    v_quiz_id := coalesce(new.quiz_id, old.quiz_id);
  else
    select q.quiz_id into v_quiz_id
    from public.quiz_questions q
    where q.id = coalesce(new.question_id, old.question_id);
  end if;

  -- Allow cascade deletion when the parent quiz itself is being deleted
  if tg_op = 'DELETE' and v_quiz_id is not null then
    if not exists (select 1 from public.quizzes where id = v_quiz_id) then
      return old;
    end if;
  end if;

  if v_quiz_id is not null and public.quiz_has_counting_attempt(v_quiz_id) then
    raise exception 'This quiz already has leaderboard attempts and its questions are locked to preserve fairness.';
  end if;

  return coalesce(new, old);
end $$;
```

#### 5. `public.activity_days` (Timezone-Aware Study Heatmap & Thresholded Streaks)
- **Only study actions** are tracked in `activity_days`:
  1. `quizzes_completed` (graded quiz attempts submitted)
  2. `cards_reviewed` (flashcards reviewed in a study session)
  3. `materials_added` (ready PDFs processed or text sets imported)
- `events_completed` is **excluded** from `activity_days` and streak calculation.
- **Minimum Daily Streak Threshold (`qualifies_for_streak`)**:
  A user's local day qualifies toward their streak if and only if they meet at least one study threshold on that day:
  - `quizzes_completed >= 1` (at least 1 graded quiz attempt), **OR**
  - `cards_reviewed >= 5` (at least 5 flashcards reviewed), **OR**
  - `materials_added >= 1` (at least 1 study material processed/imported).
```sql
create table if not exists public.activity_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  quizzes_completed int not null default 0 check (quizzes_completed >= 0),
  cards_reviewed int not null default 0 check (cards_reviewed >= 0),
  materials_added int not null default 0 check (materials_added >= 0),
  points_earned numeric not null default 0 check (points_earned >= 0),
  total_actions int generated always as (
    quizzes_completed + cards_reviewed + materials_added
  ) stored,
  qualifies_for_streak boolean generated always as (
    quizzes_completed >= 1 or cards_reviewed >= 5 or materials_added >= 1
  ) stored,
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

create index if not exists activity_days_user_date_idx
  on public.activity_days (user_id, activity_date desc);
create index if not exists activity_days_user_qualifying_idx
  on public.activity_days (user_id, activity_date desc)
  where qualifies_for_streak = true;
```

**Streak Computation (`recompute_user_streak(p_user uuid)`)**:
- Evaluates all rows in `public.activity_days` for `p_user` where `qualifies_for_streak = true`, ordered by `activity_date asc`.
- Computes exact `longest_streak`, `last_active_date` (latest qualifying `activity_date`), and `current_streak` relative to `public.user_local_date(p_user, now())` (active if `last_active_date >= local_today - 1`, else `0`).
- Called automatically by `record_study_activity` whenever a day transitions to `qualifies_for_streak = true`, and run across all users during the migration backfill.

#### 6. `public.calendar_events` (Personal Academic Calendar & Backlog)
```sql
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  event_type text not null default 'assignment'
    check (event_type in ('assignment', 'project', 'backlog', 'exam')),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  due_date date,
  due_time time,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_user_due_idx
  on public.calendar_events (user_id, due_date asc nulls last, status);
create index if not exists calendar_events_user_status_idx
  on public.calendar_events (user_id, status, event_type);
create index if not exists calendar_events_subject_idx
  on public.calendar_events (subject_id)
  where subject_id is not null;
```

*(Note: `study_groups` and cross-subject global leaderboards are deferred to a future post-refactor milestone.)*

---

### 2.2 Leaderboard Queries (`subject_leaderboard` & `quiz_leaderboard`)

```sql
create or replace function public.subject_leaderboard(p_subject uuid)
returns table (
  user_id uuid,
  username text,
  role text,
  total_points numeric,
  quizzes_taken bigint,
  avg_percent numeric,
  current_streak int,
  rank bigint
)
language sql stable security definer set search_path = public as $$
  with subj as (
    select leaderboard_epoch from public.subjects where id = p_subject
  ),
  scores as (
    select a.user_id,
           sum(a.score) as total_points,
           count(*) as quizzes_taken,
           round(avg(case when a.max_score > 0 then (a.score / a.max_score) * 100 end), 1) as avg_percent
    from public.attempts a
    cross join subj
    where a.subject_id = p_subject
      and a.counts = true
      and a.status = 'graded'
      and a.epoch = subj.leaderboard_epoch
    group by a.user_id
  )
  select le.user_id,
         p.username,
         le.role,
         coalesce(s.total_points, 0) as total_points,
         coalesce(s.quizzes_taken, 0) as quizzes_taken,
         s.avg_percent,
         coalesce(p.current_streak, 0) as current_streak,
         rank() over (
           order by coalesce(s.total_points, 0) desc,
                    coalesce(s.quizzes_taken, 0) desc
         ) as rank
  from public.library_entries le
  join public.profiles p on p.id = le.user_id
  left join scores s on s.user_id = le.user_id
  where le.subject_id = p_subject
    and public.has_subject_access(p_subject)
  order by rank asc, p.username asc;
$$;
```

---

## 3. Safe, Reversible Migration Plan & Rehearsal Protocol

### 3.1 Single-Transaction Migration (`supabase/migrations/005_user_first_subjects.sql`)
1. **No Compatibility Views**: We do **not** create `rooms` or `room_members` views. Instead, all tables/columns are renamed in-place inside a single `BEGIN ... COMMIT` transaction, all RLS policies and functions referencing old table/column names are replaced in the same transaction, and thin RPC aliases (`create_room`, `join_room`, `room_leaderboard`, `mark_seen`, `room_updates`, `rooms_with_updates`, `set_my_cover`, etc.) forward to the new `subject_*` functions.
2. **Historical Activity & Streak Backfill**:
   - Aggregates historical graded `attempts` (`submitted_at` converted via `user_local_date(user_id, submitted_at)`), ready `materials` (`created_at`), and created `decks` (`created_at` * 5 cards reviewed credit) into `public.activity_days`.
   - Calls `public.recompute_user_streak(p.id)` for every row in `public.profiles`, populating `current_streak`, `longest_streak`, and `last_active_date` accurately before the transaction commits.

### 3.2 Mandatory Pre-Production Rehearsal Step
Before running `005_user_first_subjects.sql` against the production Supabase project:
1. **Create a Database Branch / Local Copy**:
   - Run `pg_dump --dbname="$PROD_DB_URL" --format=custom --file=pre_005_backup.dump` (or create a Supabase Preview Branch / local Docker Postgres instance restored from `pre_005_backup.dump`).
2. **Execute Up Migration**:
   - Run `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/005_user_first_subjects.sql`.
3. **Verify Invariants**:
   - Confirm row counts match (`SELECT count(*) FROM public.subjects` == old `rooms` count; `SELECT count(*) FROM public.library_entries` == old `room_members` count).
   - Confirm `profiles.current_streak` and `profiles.longest_streak` are populated (`SELECT id, username, current_streak, longest_streak, last_active_date FROM public.profiles`).
   - Test `subject_leaderboard`, `quiz_leaderboard`, and quiz-question lock trigger (`prevent_locked_quiz_mutation`).
4. **Rehearse Rollback (`005_user_first_subjects_down.sql`) & Re-Apply**:
   - Run `psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/005_user_first_subjects_down.sql` to verify clean rollback to the room-first schema, then re-apply `005_user_first_subjects.sql`.

### 3.3 Data-Loss Risk Analysis

| Potential Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| **Supabase Storage PDF paths** (`<subject_id>/<uuid>.pdf`) | **None (0%)** | `subjects.id` preserves `rooms.id` 1:1. Existing PDFs stay at their exact storage paths; forked subjects physically copy files via `storage.from('materials').copy(...)` into `<new_subject_id>/<uuid>.pdf`. |
| **Existing room members losing edit rights** | **None (0%)** | Existing `room_members` with `role = 'member'` are migrated to `'editor'`. Only new share-key joiners receive `'viewer'` by default. |
| **Mid-season quiz edits invalidating leaderboard fairness** | **None (0%)** | `trg_lock_quiz_questions_after_counting_attempt` blocks mutating `quiz_questions` or `quiz_answer_keys` once any `counts = true` attempt exists. |
| **Streak drift across timezones** | **None (0%)** | All activity dates are computed via `user_local_date(user_id, now())` using `profiles.timezone`, and the client syncs the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` to `profiles.timezone`. |

---

## 4. Route Structure & Navigation

### 4.1 Primary User-First Navigation (`TopBar` + Mobile Drawer)
- **`/home` (Home Dashboard)**: Greeting, live streak banner (`current_streak`, `longest_streak`, today's qualifying progress), 14-day mini activity strip, "Due Soon" calendar items, and pinned/recent Subjects.
- **`/library` (Subject Library)**: Filterable by **All**, **My Subjects** (`owner`), and **Shared with Me** (`editor` / `viewer`). Includes **+ New Subject** and **Add with Share Key**.
- **`/calendar` (Academic Calendar & Backlog)**: Monthly calendar + Agenda + Backlog panel for `assignment | project | backlog | exam` items, optionally tagged to a Subject.
- **`/progress` (Streaks & Activity Heatmap)**: GitHub-style monthly/yearly contribution heatmap (`activity_days`), streak milestones, Corgi badges, and recent quiz attempts.
- **Subject Workspace (`/subjects/[id]/*`)**:
  1. **Materials** (`/subjects/[id]`) — PDF upload + **Formatted Text Import** (Q&A Flashcards, Multiple Choice, Mixed MCQ + Fill-in-Blank).
  2. **Flashcards** (`/subjects/[id]/flashcards`, `/new`, `/[deckId]`) — AI deck generation + direct text import + review logging (`POST /api/decks/[id]/review`).
  3. **Quizzes** (`/subjects/[id]/quizzes`, `/new`, `/[quizId]`, `/take/[attemptId]`, `/results/[attemptId]`) — AI quiz generation + direct text import + locked questions once a counting attempt exists.
  4. **Leaderboard** (`/subjects/[id]/leaderboard`) — Subject leaderboard (`counts = true` first attempts in current `leaderboard_epoch`) + reset vote.
  5. **Sharing** (`/subjects/[id]/sharing`) — Share key reveal/regenerate, `share_enabled` toggle, `allow_fork` toggle, member list with manual role promotion/demotion (`viewer` <-> `editor`), **Transfer Ownership**, and **Fork Subject**.

---

## 5. Permissions, Share Key, Ownership Transfer & Fork Flows

### 5.1 Role Permission Matrix (`owner` | `editor` | `viewer`)

| Action | `owner` | `editor` | `viewer` |
| :--- | :---: | :---: | :---: |
| View & download materials, study notes, flashcard decks, quizzes | [PASS] | [PASS] | [PASS] |
| Study flashcards & log review sessions toward personal streak | [PASS] | [PASS] | [PASS] |
| Take quizzes (first attempt counts on leaderboard; retries are practice) | [PASS] | [PASS] | [PASS] |
| View Subject & Quiz Leaderboards and vote on leaderboard reset polls | [PASS] | [PASS] | [PASS] |
| **Fork subject** into own personal editable copy (when `allow_fork = true`) | [PASS] | [PASS] | [PASS] |
| Upload PDFs, import formatted text sets, generate AI decks/quizzes | [PASS] | [PASS] | [FAIL] |
| Delete own uploaded materials, decks, or quizzes | [PASS] | [PASS] | [FAIL] |
| Delete *any* material, deck, or quiz in the subject | [PASS] | [FAIL] | [FAIL] |
| Edit subject name/description, toggle `share_enabled` / `allow_fork` | [PASS] | [FAIL] | [FAIL] |
| View/regenerate `share_key` | [PASS] | [FAIL] | [FAIL] |
| Promote/demote members (`viewer` <-> `editor`) or remove members | [PASS] | [FAIL] | [FAIL] |
| **Transfer Ownership** (`transfer_subject_ownership`) to another member | [PASS] | [FAIL] | [FAIL] |
| Leave subject (remove own `library_entries` row) | [FAIL] *(transfer or delete)* | [PASS] | [PASS] |
| Delete entire subject & storage files | [PASS] | [FAIL] | [FAIL] |

### 5.2 Share Key Flow (Always Grants `'viewer'`)
- Calling `add_shared_subject(p_key)` verifies rate limits (`join_failures`), checks `share_enabled = true`, and inserts `(subject_id, auth.uid(), 'viewer')` into `public.library_entries` (`on conflict do nothing`).
- If the owner wants a collaborator to upload materials or create quizzes, the owner promotes them from `'viewer'` to `'editor'` in `/subjects/[id]/sharing` via `set_member_role(p_subject, p_user, 'editor')`.

### 5.3 Ownership Transfer Flow (`transfer_subject_ownership(p_subject, p_new_owner)`)
- Only the current `owner` can call `transfer_subject_ownership(p_subject, p_new_owner)`.
- Target user must already have a row in `library_entries` for `p_subject`.
- Atomically updates `subjects.owner_id = p_new_owner`, sets the target user's `library_entries.role = 'owner'`, and demotes the previous owner's `library_entries.role = 'editor'`.

### 5.4 Subject Fork Flow (Physical Storage Copy + Attribution)
1. Checks `has_subject_access(subjectId)` and `(subject.allow_fork = true or isOwner)`.
2. Calls `POST /api/subjects/[id]/fork`:
   - Creates the new `subjects` row owned by `auth.uid()` with `forked_from_id = source.id`, `forked_from_name = source.name`, and `forked_from_owner_id = source.owner_id`.
   - For each source material with a `file_path`: physically copies the PDF in Supabase Storage from `<source_subject_id>/<file>.pdf` to `<new_subject_id>/<uuid>.pdf` via `admin.storage.from('materials').copy(srcPath, destPath)`, and inserts the new `materials` row with `forked_from_id`.
   - Clones all `decks` + `cards` and `quizzes` + `quiz_questions` + `quiz_answer_keys` (remapping `material_ids` to the cloned material UUIDs).

---

## 6. Phased PR Breakdown

### PR 1 — Database Migration (`005_user_first_subjects.sql`), Backfill & Core Schema Updates *(Current Step)*
- Create `supabase/migrations/005_user_first_subjects.sql` and `supabase/migrations/005_user_first_subjects_down.sql`, and update `supabase/schema.sql`.
- In a single transaction:
  - Rename `rooms` → `subjects`, `room_members` → `library_entries`, `room_seen` → `subject_seen`, and `room_id` → `subject_id`.
  - Add timezone & streak columns to `profiles`, fork/sharing columns to `subjects`, `source_type` & `forked_from_id` to `materials`/`decks`/`quizzes`.
  - Create `activity_days` (study-only counters, thresholded `qualifies_for_streak`, timezone-aware `user_local_date`) and `calendar_events`.
  - Backfill `activity_days` and `profiles.(current_streak, longest_streak, last_active_date)` from historical activity.
  - Add quiz fairness lock trigger `trg_lock_quiz_questions_after_counting_attempt`.
  - Replace all RLS policies and functions to reference the new table/column names, and provide thin RPC aliases for legacy RPC calls (no compatibility views).
  - Update direct `.from("rooms")` / `.from("room_members")` / `room_id` queries in `apps/web/src` so the app compiles and runs against the migrated schema immediately without compatibility views.

### PR 2 — Permissions Service, Shared Types, Mobile `api-client` & Core Subject APIs
- Update `packages/shared-types` and `packages/api-client` (maintaining mobile compatibility).
- Update `authService.ts` (`requireSubject`, `apiSubjectMember` with `'owner' | 'editor' | 'viewer'`).
- Add `POST /api/subjects/[id]/fork` (with physical storage copy), `POST /api/decks/[id]/review` (card review streak logging), and timezone sync endpoint.

### PR 3 — Deterministic Text Import Parser (No-AI Q&A, MCQ, Mixed MCQ + Fill-in-Blank)
- Build `packages/shared-utils/src/textImportParser.ts` supporting:
  1. Formatted Q&A Flashcard blocks (`Q:` / `A:` or `term :: definition`) → creates `materials` (`source_type = 'text'`) + `decks` (`source_type = 'import'`) + `cards` without AI.
  2. Standalone Multiple Choice blocks (`[MCQ]` or numbered questions with `A)..D)` and `*` / `ANSWER:` key) → creates `quizzes` (`source_type = 'import'`) without AI.
  3. Mixed Multiple Choice + Fill-in-the-Blank (`[MCQ]` + `[BLANK]` / `_____` with `ANSWER:`) → creates mixed `quizzes` without AI.
- Wire into `POST /api/subjects/[id]/import` and the Subject Materials / Flashcards / Quizzes UI.

### PR 4 — Subject Workspace Routes (`/subjects/[id]/*`), Sharing Tab, Ownership Transfer & Fork UI
- Move `/rooms/[id]/*` → `/subjects/[id]/*` (keeping `/rooms/[id]/*` redirects).
- Build `/subjects/[id]/sharing` (`SharingClient`) with `share_enabled` & `allow_fork` toggles, role promotion/demotion (`viewer` <-> `editor`), ownership transfer dialog,fork attribution badge, and **Fork Subject** button.

### PR 5 — User-First Navigation, `/library`, and Personal Dashboard (`/home`)
- Update `TopBar.tsx` with `Home`, `Library`, `Calendar`, `Progress` navigation and live streak badge.
- Build `/home` (Personal Dashboard) and `/library` (Subject Library with `All`, `My Subjects`, `Shared with Me`, `Pinned`).

### PR 6 — Personal Academic Calendar (`/calendar`) & Activity Heatmap / Streaks (`/progress`)
- Build `/calendar` (`assignment`, `project`, `backlog`, `exam` management + backlog drawer).
- Build `/progress` (GitHub-style monthly/yearly heatmap, streak stats, Corgi milestone badges, and attempt history).
- Remove temporary legacy RPC aliases.

---

## 7. Forensic Root-Cause Analysis: Onboarding RLS Error

### 7.1 Observed Symptoms & Error
When a new or un-onboarded user navigated to `/onboarding` and submitted a username, the UI presented the error:
```
new row violates row-level security policy for table "profiles" (Postgres Error Code: 42501)
```
Simultaneously, navigating back to `/home` or clicking "Back to home" returned the user immediately to `/onboarding`.

### 7.2 Root Cause Decomposition
The error resulted from the intersection of three factors:

1. **Missing `INSERT` Policy on `public.profiles`**:
   In the initial database schema (`schema.sql`), `public.profiles` had RLS enabled, but only defined `SELECT` (`"profiles read"`) and `UPDATE` (`"profiles update own"`):
   ```sql
   create policy "profiles read" on public.profiles for select to authenticated using (...);
   create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
   ```
   There was **NO `INSERT` policy** for the `authenticated` role. The architecture assumed user profiles would exclusively be seeded via the database trigger `on_auth_user_created -> public.handle_new_user()` running as `SECURITY DEFINER`.

2. **Trigger Failures & Clean Users**:
   If a user was created without the trigger firing (e.g. users created before migration, OAuth callbacks with incomplete profile sync, or trigger execution failure), no row existed in `public.profiles` for `auth.uid()`.

3. **Client-Side and Route Handler INSERT Attempts**:
   - In the legacy `app/onboarding/UsernameForm.tsx`, an `update` was executed directly from the browser:
     ```ts
     await supabase.from("profiles").update({ username: name }).eq("id", user.id);
     ```
     When no row existed for `user.id`, the `UPDATE` modified 0 rows without raising an error. The user was redirected to `/home`, where `requireProfile()` saw `profile.username == null` and redirected right back to `/onboarding`.
   - In the API route `POST /api/profile/username`:
     ```ts
     const { data: updated } = await supabase.from("profiles").update({ username }).eq("id", user.id).select("id").maybeSingle();
     if (!updated) {
       const { error: insertErr } = await supabase.from("profiles").insert({ id: user.id, username });
     }
     ```
     Because `updated` was null (0 rows matched), the route executed `insert()` using `supabase` (the authenticated user client). Because `public.profiles` had no `INSERT` policy, PostgreSQL rejected the statement with error code `42501`:
     `new row violates row-level security policy for table "profiles"`.

4. **Service-Role Key Fallback Ingestion**:
   In early revisions of `createAdmin()`, if `process.env.SUPABASE_SERVICE_ROLE_KEY` was missing or unresolved at runtime, `@supabase/supabase-js` defaulted to unauthenticated (anon) requests rather than failing fast. When invoked to provision a missing profile, the unauthenticated client hit the exact same `42501` RLS violation.

### 7.3 Resolution Architecture
1. **Atomic Security Definer RPC (`set_my_username`)**:
   In `005_user_first_subjects.sql`, username assignment is executed through an atomic `SECURITY DEFINER` function:
   ```sql
   create or replace function public.set_my_username(p_username text)
   returns text
   language plpgsql
   security definer set search_path = public
   as $$
   declare
     v_uid uuid := auth.uid();
   begin
     ...
     insert into public.profiles (id, username)
     values (v_uid, p_username)
     on conflict (id) do update set username = excluded.username;
     return p_username;
   exception when unique_violation then
     raise exception 'That username is already taken. Try another.' using errcode = '23505';
   end;
   $$;
   ```
2. **Explicit `INSERT` Policy**:
   Added `create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());` to ensure authenticated users can insert their own row if needed.
3. **Fail-Loud Server Validation**:
   `createAdmin()` strictly checks for `SUPABASE_SERVICE_ROLE_KEY` and throws a loud fatal error on startup (`[FATAL] SUPABASE_SERVICE_ROLE_KEY is missing...`) preventing silent fallbacks to unauthenticated calls.

