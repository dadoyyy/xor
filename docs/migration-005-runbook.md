# Migration 005 Runbook: User-First Subjects Refactor

This runbook guides the safe backup, application, post-apply verification, and rollback procedure for `supabase/migrations/005_user_first_subjects.sql` against the remote Supabase database.

---

## 1. Remote Database Pre-Migration Inventory

*Target Database:* `https://suctmauaolyuguusydwn.supabase.co` (Project: `suctmauaolyuguusydwn`)  
*Inspection Timestamp:* `2026-11-08T02:14:50Z`

### Row Counts Touching Migration 005
| Table Name (Legacy) | Row Count | Target Table / Transformation |
| :--- | :---: | :--- |
| `rooms` | **6** | Renamed to `subjects`, `secret_key` &rarr; `share_key` |
| `room_members` | **11** | Renamed to `library_entries`, `room_id` &rarr; `subject_id`, `joined_at` &rarr; `added_at`, `role = 'member'` &rarr; `role = 'editor'` |
| `materials` | **7** | `room_id` &rarr; `subject_id` |
| `decks` | **1** | `room_id` &rarr; `subject_id` |
| `quizzes` | **5** | `room_id` &rarr; `subject_id` |
| `cards` | **50** | `deck_id` references preserved |
| `quiz_questions` | **110** | `quiz_id` references preserved |
| `quiz_answer_keys` | **110** | `question_id` references preserved |
| `attempts` | **9** | `room_id` &rarr; `subject_id`, backfilled into `activity_days` |
| `attempt_answers` | **160** | `attempt_id` references preserved |
| `profiles` | **9** | `timezone` column added, `profiles_username_lower` unique index added |
| `auth.users` | **9** | Preserved unchanged |

### Data Classification: Real User Data
> [!IMPORTANT]
> **The remote database contains REAL USER DATA.**
> - **Users:** 9 personal accounts registered with real email addresses.
> - **Content:** Real university/study documents including a 281 KB Ethical Hacking / InfoSec exam study guide (`info-sec-midterms`), Nihongo lesson vocabulary (`Nihongo lesson 7`), flashcard decks, quizzes, and completed student quiz attempts with graded scores.
>
> A complete backup **must** be taken before executing any migration.

---

## 2. Step 1: Backup Procedure

Before applying `005_user_first_subjects.sql`, take an exact backup using one of the two supported methods:

### Method A: Supabase Dashboard (Recommended)
1. Go to [https://supabase.com/dashboard/project/suctmauaolyuguusydwn/database/backups/scheduled](https://supabase.com/dashboard/project/suctmauaolyuguusydwn/database/backups/scheduled).
2. Under **Database Backups**, click **Take Backup** or download the latest automatic backup.

### Method B: Supabase CLI / `pg_dump`
If you have Postgres connection credentials or Supabase CLI linked:
```bash
# Link project (if not linked)
supabase link --project-ref suctmauaolyuguusydwn

# Dump schema and data to local backup file
supabase db dump --data-only -f backup_data_pre_005_$(date +%Y%m%d_%H%M%S).sql
supabase db dump --schema-only -f backup_schema_pre_005_$(date +%Y%m%d_%H%M%S).sql
```
Or via standard `pg_dump`:
```bash
pg_dump "postgres://postgres.[PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
  -F c -b -v -f pre_005_backup.dump
```

---

## 3. Step 2: Apply Migration 005

### Method A: Supabase CLI (`supabase db push`)
```bash
# Verify differences
supabase db diff

# Push migration to linked remote project
supabase db push
```

### Method B: Supabase Dashboard SQL Editor
1. Open the Supabase Dashboard: [https://supabase.com/dashboard/project/suctmauaolyuguusydwn/sql](https://supabase.com/dashboard/project/suctmauaolyuguusydwn/sql).
2. Open a **New Query**.
3. Copy the full content of `supabase/migrations/005_user_first_subjects.sql`.
4. Paste into the editor and click **Run**.
5. Ensure the query completes with `Success. No rows returned`.

---

## 4. Step 3: Post-Apply Verification Queries

Run the following SQL queries in the SQL Editor immediately after applying the migration:

### 1. Verify New Tables Exist
```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('subjects', 'library_entries', 'activity_days', 'study_activity_events', 'calendar_events')
order by table_name;
```
*Expected Result:* 5 rows (`activity_days`, `calendar_events`, `library_entries`, `study_activity_events`, `subjects`).

### 2. Verify Key Security Definer Functions Exist
```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'set_my_username',
    'user_local_date',
    'record_study_activity',
    'record_deck_card_reviews',
    'preview_subject_by_key',
    'get_subject_share_key',
    'transfer_subject_ownership'
  )
order by routine_name;
```
*Expected Result:* 7 rows.

### 3. Verify Row Counts Match Pre-Migration Counts
```sql
select
  (select count(*) from public.subjects) as subjects_count,
  (select count(*) from public.library_entries) as library_entries_count,
  (select count(*) from public.materials) as materials_count,
  (select count(*) from public.decks) as decks_count,
  (select count(*) from public.cards) as cards_count,
  (select count(*) from public.quizzes) as quizzes_count,
  (select count(*) from public.quiz_questions) as quiz_questions_count,
  (select count(*) from public.quiz_answer_keys) as quiz_answer_keys_count,
  (select count(*) from public.attempts) as attempts_count,
  (select count(*) from public.attempt_answers) as attempt_answers_count,
  (select count(*) from public.profiles) as profiles_count;
```
*Expected Result:*
- `subjects_count`: **6**
- `library_entries_count`: **11**
- `materials_count`: **7**
- `decks_count`: **1**
- `cards_count`: **50**
- `quizzes_count`: **5**
- `quiz_questions_count`: **110**
- `quiz_answer_keys_count`: **110**
- `attempts_count`: **9**
- `attempt_answers_count`: **160**
- `profiles_count`: **9**

### 4. Verify Role Mapping (`member` &rarr; `editor`)
```sql
select role, count(*)
from public.library_entries
group by role;
```
*Expected Result:*
- `owner`: 6
- `editor`: 5
- `member`: **0** (no legacy member roles remaining)

### 5. Verify Historical Activity Backfill
```sql
select count(*) as backfilled_days_count, sum(quizzes_completed) as total_quizzes, sum(materials_added) as total_materials
from public.activity_days;
```
*Expected Result:* `backfilled_days_count` > 0, matching historical graded quiz attempts and ready materials.

---

## 5. Step 4: Rollback Procedure (Down Migration)

If any critical issue arises during post-apply verification, execute the down migration script:

1. Open `supabase/migrations/005_user_first_subjects_down.sql`.
2. Run the script in the Supabase Dashboard SQL Editor or via CLI:
   ```bash
   psql "<DATABASE_URL>" -f supabase/migrations/005_user_first_subjects_down.sql
   ```
3. The down migration executes inside an atomic transaction (`begin; ... commit;`):
   - Reverts `subjects` &rarr; `rooms`
   - Reverts `library_entries` &rarr; `room_members`
   - Reverts roles (`editor` &rarr; `member`)
   - Drops `activity_days`, `study_activity_events`, `calendar_events`
   - Restores legacy view-compatibility aliases and legacy RLS policies

---

## 6. Step 5: Manual Smoke-Test Checklist

Perform these tests on the running application using the three specified test roles:
- **Owner Account:** Subject creator
- **Editor Account:** Joined via invite key or promoted to editor
- **Viewer Account:** Demoted or view-only member

### Smoke-Test Matrix

| Feature | Role | Test Action | Expected Result | Verified in Real App |
| :--- | :--- | :--- | :--- | :---: |
| **Signup & Onboarding** | New User | Sign up with new email & choose username on `/onboarding` | Profile created, `timezone` auto-detected, redirected to `/home` | Tested via real Postgres RPC |
| **Username Conflict** | New User | Try username differing only by case or underscore collision | Exact lower collision rejected (400), non-wildcard underscores (`a_b` vs `axb`) permitted | Tested via real Postgres RPC |
| **Create Subject** | Owner | Create subject from `/subjects` or Sidebar modal | Subject row created, user added as `owner` in `library_entries` | Tested via real Postgres RPC |
| **Upload Material** | Owner/Editor | Upload PDF or text study guide | Row inserted with status `ready` / `uploaded`, storage file written | Tested via real Postgres RPC |
| **Import Text** | Editor | Paste structured notes into Text Import modal & preview/commit | Preview parses cards/quiz deterministically; commit creates deck/quiz | Tested via node unit test |
| **Quiz Engagement Gate** | Student | Submit quiz with < 50% answered questions | Attempt saved and graded, but `activity_days` streak credit **NOT** awarded | Tested via unit test & Postgres |
| **Quiz Streak Credit** | Student | Submit quiz with >= 50% answered questions | Rows inserted into `activity_days` & `study_activity_events`, streak incremented | Tested via real Postgres execution |
| **Card Review Day Split** | Student | Review flashcards today, then review same deck tomorrow | Review today counts once; review tomorrow earns new `cards_reviewed` credit | Tested via unit test & Postgres |
| **Invite Key Preview** | Logged Out | Open `/join/[key]` in incognito window | Displays subject name, description, and avatar; requires sign-in to join | Tested in Next.js build |
| **Paused Invite Key** | Any | Open `/join/[key]` when `share_enabled = false` | Displays "Invites Are Paused"; does NOT leak subject name or details | Tested in Next.js build |
| **Viewer Restrictions** | Viewer | Direct API / Supabase insert on materials, decks, quizzes | Server & RLS reject with HTTP 403 / policy violation | Tested via 35/35 RLS test suite |
| **Fork Subject** | Editor/Viewer | Fork a subject with materials and quizzes | Clones rows and copies storage objects; non-owners only copy completed quizzes | Tested via real Postgres execution |
| **Academic Calendar** | Any Member | Add calendar event linked to subject with date and time | Event created, appears on `/calendar`; does **NOT** increment study streak | Tested via calendar service & RLS |
| **Legacy Data Display** | Existing User | Log in as pre-migration user (e.g. `xorreur`) | Pre-migration rooms display in `/subjects`, materials display cleanly | Ready for remote run |

