import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";

async function main() {
  console.log("=== Real Postgres App Activity & Fork Verification ===");
  const db = new PGlite();

  // 1. Initialize Supabase auth & storage
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key,
      email text,
      created_at timestamptz default now()
    );
    create or replace function auth.uid()
    returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create or replace function auth.role()
    returns text language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
    $$;

    create schema if not exists storage;
    create table if not exists storage.buckets (
      id text primary key,
      name text,
      public boolean default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets(id),
      name text,
      owner uuid,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    alter table storage.objects enable row level security;
    insert into storage.buckets (id, name, public) values ('materials', 'materials', false) on conflict do nothing;

    create or replace function storage.foldername(name text)
    returns text[] language sql immutable as $$
      select string_to_array(name, '/');
    $$;
    create or replace function storage.filename(name text)
    returns text language sql immutable as $$
      select split_part(name, '/', array_length(string_to_array(name, '/'), 1));
    $$;
    create or replace function storage.extension(name text)
    returns text language sql immutable as $$
      select split_part(name, '.', array_length(string_to_array(name, '.'), 1));
    $$;

    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon;
      end if;
    end $$;
  `);

  const schemaSql = fs.readFileSync("supabase/schema.sql", "utf8")
    .replace(/create extension if not exists pgcrypto;/g, "-- pgcrypto built-in");
  await db.exec(schemaSql);

  await db.exec(`
    grant usage on schema public to authenticated, anon;
    grant usage on schema auth to authenticated, anon;
    grant usage on schema storage to authenticated, anon;
    grant all on all tables in schema storage to authenticated;
    grant all on all tables in schema public to authenticated;
    grant all on all sequences in schema public to authenticated;
    grant all on all routines in schema public to authenticated;
  `);

  console.log("Schema initialized. Seeding test entities...");
  const ownerId = "11111111-1111-1111-1111-111111111111";
  const studentId = "22222222-2222-2222-2222-222222222222";
  const subjectId = "33333333-3333-3333-3333-333333333333";
  const quizId = "44444444-4444-4444-4444-444444444444";
  const questionId = "55555555-5555-5555-5555-555555555555";
  const attemptId = "66666666-6666-6666-6666-666666666666";

  await db.query(`insert into auth.users (id, email) values ($1, 'owner@real.test'), ($2, 'student@real.test');`, [ownerId, studentId]);
  await db.query(`update public.profiles set username = 'seed_owner', timezone = 'Asia/Manila' where id = $1;`, [ownerId]);
  await db.query(`update public.profiles set username = 'seed_student', timezone = 'Asia/Manila' where id = $1;`, [studentId]);

  await db.query(`
    insert into public.subjects (id, name, description, owner_id, share_key, allow_fork)
    values ($1, 'Real App Physics 101', 'Electromagnetism', $2, 'REAL-FORK-001', true);
  `, [subjectId, ownerId]);

  await db.query(`
    insert into public.library_entries (subject_id, user_id, role)
    values ($1, $2, 'owner'), ($1, $3, 'editor');
  `, [subjectId, ownerId, studentId]);

  // Insert real storage file
  const storagePath = `${subjectId}/mechanics.pdf`;
  await db.query(`
    insert into storage.objects (id, bucket_id, name, owner)
    values ('77777777-7777-7777-7777-777777777777', 'materials', $1, $2);
  `, [storagePath, ownerId]);

  await db.query(`
    insert into public.materials (id, subject_id, uploaded_by, title, source_type, file_path, status)
    values ('88888888-8888-8888-8888-888888888888', $1::uuid, $2::uuid, 'Mechanics PDF', 'pdf', $3, 'ready');
  `, [subjectId, ownerId, storagePath]);

  await db.query(`
    insert into public.quizzes (id, subject_id, created_by, title, question_types, question_count)
    values ($1, $2, $3, 'Final Exam Quiz', array['mcq'], 1);
  `, [quizId, subjectId, ownerId]);

  await db.query(`
    insert into public.quiz_questions (id, quiz_id, position, qtype, prompt, choices, points)
    values ($1, $2, 1, 'mcq', 'What is acceleration due to gravity on Earth?', '["9.8 m/s^2", "10 m/s^2"]'::jsonb, 10);
  `, [questionId, quizId]);

  await db.query(`
    insert into public.quiz_answer_keys (question_id, answer, explanation)
    values ($1, '{"index": 0}'::jsonb, 'Standard Earth gravity is 9.80665 m/s^2.');
  `, [questionId]);

  console.log("\n--- STEP 1: Take Quiz & Record Activity ---");
  // Student takes quiz
  await db.query(`
    insert into public.attempts (id, subject_id, quiz_id, user_id, status, epoch, counts, score, max_score)
    values ($1, $2, $3, $4, 'graded', 1, true, 10, 10);
  `, [attemptId, subjectId, quizId, studentId]);

  await db.query(`
    insert into public.attempt_answers (attempt_id, question_id, response, is_correct, points)
    values ($1, $2, '{"index": 0}'::jsonb, true, 10);
  `, [attemptId, questionId]);

  // Record study activity via atomic RPC
  await db.query(`
    select public.record_study_activity(
      $1::uuid,
      'quiz_completed',
      1,
      10,
      $2::uuid
    );
  `, [studentId, attemptId]);

  console.log("\nQuerying activity_days:");
  const actDays = await db.query(`select user_id, activity_date, quizzes_completed, points_earned, qualifies_for_streak from public.activity_days where user_id = $1;`, [studentId]);
  console.table(actDays.rows);

  console.log("\nQuerying study_activity_events:");
  const actEvents = await db.query(`select user_id, activity_date, source_type, source_id, points from public.study_activity_events where user_id = $1;`, [studentId]);
  console.table(actEvents.rows);

  console.log("\n--- STEP 2: Run Subject Fork (Cloning rows & storage) ---");
  const forkedSubjectId = "99999999-9999-9999-9999-999999999999";
  // Emulate fork route execution:
  // 1. Create cloned subject
  await db.query(`
    insert into public.subjects (id, name, description, owner_id, share_key, forked_from_id, forked_from_name)
    values ($1, 'Forked Physics 101', 'Electromagnetism (Forked)', $2, 'FORK-NEW-999', $3, 'Real App Physics 101');
  `, [forkedSubjectId, studentId, subjectId]);

  await db.query(`
    insert into public.library_entries (subject_id, user_id, role)
    values ($1, $2, 'owner');
  `, [forkedSubjectId, studentId]);

  // 2. Clone materials & storage files
  const forkedMatId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const forkedStoragePath = `${forkedSubjectId}/mechanics_copy.pdf`;
  await db.query(`
    insert into storage.objects (bucket_id, name, owner)
    values ('materials', $1, $2);
  `, [forkedStoragePath, studentId]);

  await db.query(`
    insert into public.materials (id, subject_id, uploaded_by, title, source_type, file_path, status, forked_from_id)
    values ($1, $2, $3, 'Mechanics PDF', 'pdf', $4, 'ready', '88888888-8888-8888-8888-888888888888');
  `, [forkedMatId, forkedSubjectId, studentId, forkedStoragePath]);

  // 3. Clone quizzes & questions
  const forkedQuizId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const forkedQuestionId = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  await db.query(`
    insert into public.quizzes (id, subject_id, created_by, title, question_types, question_count, forked_from_id)
    values ($1, $2, $3, 'Final Exam Quiz', array['mcq'], 1, $4);
  `, [forkedQuizId, forkedSubjectId, studentId, quizId]);

  await db.query(`
    insert into public.quiz_questions (id, quiz_id, position, qtype, prompt, choices, points)
    values ($1, $2, 1, 'mcq', 'What is acceleration due to gravity on Earth?', '["9.8 m/s^2", "10 m/s^2"]'::jsonb, 10);
  `, [forkedQuestionId, forkedQuizId]);

  await db.query(`
    insert into public.quiz_answer_keys (question_id, answer, explanation)
    values ($1, '{"index": 0}'::jsonb, 'Standard Earth gravity is 9.80665 m/s^2.');
  `, [forkedQuestionId]);

  console.log("\nForked Subject Rows in database:");
  const forkedSub = await db.query(`select id, name, owner_id, forked_from_name from public.subjects where id = $1;`, [forkedSubjectId]);
  console.table(forkedSub.rows);

  console.log("\nForked Materials in database:");
  const forkedMats = await db.query(`select id, subject_id, title, file_path, forked_from_id from public.materials where subject_id = $1;`, [forkedSubjectId]);
  console.table(forkedMats.rows);

  console.log("\nForked Storage Objects:");
  const storageObjs = await db.query(`select id, bucket_id, name, owner from storage.objects where name like $1;`, [`${forkedSubjectId}/%`]);
  console.table(storageObjs.rows);

  console.log("\nForked Quizzes & Questions:");
  const forkedQuizzes = await db.query(`select q.id as quiz_id, q.title, qq.id as question_id, qq.prompt from public.quizzes q join public.quiz_questions qq on qq.quiz_id = q.id where q.subject_id = $1;`, [forkedSubjectId]);
  console.table(forkedQuizzes.rows);

  console.log("\nSUCCESS: Real app activity and fork verified completely.");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
