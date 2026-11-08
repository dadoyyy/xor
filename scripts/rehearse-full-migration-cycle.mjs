import { PGlite } from "@electric-sql/pglite";
import fs from "fs";

async function main() {
  console.log("===============================================================================");
  console.log("STEP 1: Initializing clean PostgreSQL (PGlite engine) & Supabase environment...");
  console.log("===============================================================================");
  const db = new PGlite();

  // 1. Supabase core auth & storage schemas and helpers
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

    grant usage on schema public to authenticated, anon;
    grant usage on schema auth to authenticated, anon;
    grant usage on schema storage to authenticated, anon;
    grant all on all tables in schema storage to authenticated;
  `);

  console.log("===============================================================================");
  console.log("STEP 2: Seeding pre-005 real database backup (509 rows)...");
  console.log("===============================================================================");
  const backupSql = fs.readFileSync("backups/backup_20261108.sql", "utf8");
  await db.exec(backupSql);

  // Sync auth.users from public.profiles
  await db.exec(`
    insert into auth.users (id)
    select id from public.profiles
    on conflict (id) do nothing;
  `);

  const preCounts = await db.query(`
    select
      (select count(*) from public.rooms) as rooms,
      (select count(*) from public.room_members) as room_members,
      (select count(*) from public.materials) as materials,
      (select count(*) from public.decks) as decks,
      (select count(*) from public.cards) as cards,
      (select count(*) from public.quizzes) as quizzes,
      (select count(*) from public.quiz_questions) as quiz_questions,
      (select count(*) from public.quiz_answer_keys) as quiz_answer_keys,
      (select count(*) from public.attempts) as attempts,
      (select count(*) from public.attempt_answers) as attempt_answers,
      (select count(*) from public.profiles) as profiles;
  `);
  console.log("Pre-005 Seeded Counts:");
  console.table(preCounts.rows);

  console.log("===============================================================================");
  console.log("STEP 3: Executing UP migration: 005_user_first_subjects.sql (1st run)...");
  console.log("===============================================================================");
  const upSql = fs.readFileSync("supabase/migrations/005_user_first_subjects.sql", "utf8");
  const t0 = Date.now();
  await db.exec(upSql);
  console.log(`UP migration completed successfully in ${Date.now() - t0}ms!`);

  const postUp1 = await db.query(`
    select
      (select count(*) from public.subjects) as subjects,
      (select count(*) from public.library_entries) as library_entries,
      (select count(*) from public.materials) as materials,
      (select count(*) from public.decks) as decks,
      (select count(*) from public.cards) as cards,
      (select count(*) from public.quizzes) as quizzes,
      (select count(*) from public.quiz_questions) as quiz_questions,
      (select count(*) from public.quiz_answer_keys) as quiz_answer_keys,
      (select count(*) from public.attempts) as attempts,
      (select count(*) from public.attempt_answers) as attempt_answers,
      (select count(*) from public.profiles) as profiles,
      (select count(*) from public.activity_days) as activity_days,
      (select count(*) from public.study_activity_events) as study_activity_events;
  `);
  console.log("Post-UP 1 Counts:");
  console.table(postUp1.rows);

  const rolesUp1 = await db.query(`select role, count(*) from public.library_entries group by role order by role;`);
  console.log("Library Entries Role Distribution (member -> editor check):");
  console.table(rolesUp1.rows);

  console.log("===============================================================================");
  console.log("STEP 4: Executing DOWN migration: 005_user_first_subjects_down.sql...");
  console.log("===============================================================================");
  const downSql = fs.readFileSync("supabase/migrations/005_user_first_subjects_down.sql", "utf8");
  const t1 = Date.now();
  await db.exec(downSql);
  console.log(`DOWN migration completed successfully in ${Date.now() - t1}ms!`);

  const postDown = await db.query(`
    select
      (select count(*) from public.rooms) as rooms,
      (select count(*) from public.room_members) as room_members,
      (select count(*) from public.materials) as materials,
      (select count(*) from public.decks) as decks,
      (select count(*) from public.quizzes) as quizzes,
      (select count(*) from public.attempts) as attempts,
      (select count(*) from public.profiles) as profiles;
  `);
  console.log("Post-DOWN Counts (Reverted to rooms/room_members):");
  console.table(postDown.rows);

  const rolesDown = await db.query(`select role, count(*) from public.room_members group by role order by role;`);
  console.log("Room Members Reverted Roles:");
  console.table(rolesDown.rows);

  console.log("===============================================================================");
  console.log("STEP 5: Executing UP migration: 005_user_first_subjects.sql (2nd run)...");
  console.log("===============================================================================");
  const t2 = Date.now();
  await db.exec(upSql);
  console.log(`Second UP migration completed successfully in ${Date.now() - t2}ms!`);

  const postUp2 = await db.query(`
    select
      (select count(*) from public.subjects) as subjects,
      (select count(*) from public.library_entries) as library_entries,
      (select count(*) from public.materials) as materials,
      (select count(*) from public.decks) as decks,
      (select count(*) from public.quizzes) as quizzes,
      (select count(*) from public.attempts) as attempts,
      (select count(*) from public.profiles) as profiles;
  `);
  console.log("Post-UP 2 Counts:");
  console.table(postUp2.rows);

  console.log("===============================================================================");
  console.log("STEP 6: Running 35/35 RLS Test Suite against the Migrated Database...");
  console.log("===============================================================================");
  await db.exec(`
    grant usage on schema public to authenticated, anon;
    grant usage on schema storage to authenticated, anon;
    grant all on all tables in schema storage to authenticated;
    grant all on all tables in schema public to authenticated;
    grant all on all sequences in schema public to authenticated;
    grant all on all routines in schema public to authenticated;
  `);

  const rlsSql = fs.readFileSync("supabase/tests/rls_viewer_restrictions.sql", "utf8");
  await db.exec(rlsSql);

  const rlsResults = await db.query("select id, test_name, passed, details from rls_test_results order by id;");
  console.table(rlsResults.rows);

  const failedTests = rlsResults.rows.filter(r => !r.passed);
  if (failedTests.length > 0) {
    console.error(`\nRLS SUITE FAILED: ${failedTests.length} tests failed!`);
    process.exit(1);
  }

  console.log(`\nALL ${rlsResults.rows.length} RLS SECURITY TESTS PASSED ON REAL MIGRATED SCHEMA!`);
  await db.close();
}

main().catch(err => {
  console.error("Migration rehearsal failed:", err.message);
  process.exit(1);
});
