import { PGlite } from "@electric-sql/pglite";
import fs from "fs";

async function main() {
  const db = new PGlite();
  await db.exec(`
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key, email text, created_at timestamptz default now());
    create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
    create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon'); $$;
    create schema if not exists storage;
    create table if not exists storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid, created_at timestamptz default now(), updated_at timestamptz default now());
    alter table storage.objects enable row level security;
    insert into storage.buckets (id, name, public) values ('materials', 'materials', false) on conflict do nothing;
    create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/'); $$;
    create or replace function storage.filename(name text) returns text language sql immutable as $$ select split_part(name, '/', array_length(string_to_array(name, '/'), 1)); $$;
    create or replace function storage.extension(name text) returns text language sql immutable as $$ select split_part(name, '.', array_length(string_to_array(name, '.'), 1)); $$;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
    end $$;
    grant usage on schema public to authenticated, anon;
    grant usage on schema auth to authenticated, anon;
    grant usage on schema storage to authenticated, anon;
    grant all on all tables in schema storage to authenticated;
  `);

  await db.exec(fs.readFileSync("backups/backup_20261108.sql", "utf8"));
  await db.exec("insert into auth.users (id) select id from public.profiles on conflict (id) do nothing;");
  await db.exec(fs.readFileSync("supabase/migrations/005_user_first_subjects.sql", "utf8"));

  await db.exec(`
    grant usage on schema public to authenticated, anon;
    grant usage on schema storage to authenticated, anon;
    grant all on all tables in schema storage to authenticated;
    grant all on all tables in schema public to authenticated;
    grant all on all sequences in schema public to authenticated;
    grant all on all routines in schema public to authenticated;
  `);

  await db.exec(fs.readFileSync("supabase/tests/rls_viewer_restrictions.sql", "utf8"));
  const res = await db.query("select id, test_name, passed, details from rls_test_results order by id;");
  const failed = res.rows.filter(r => !r.passed);
  console.log("Failed tests count:", failed.length);
  console.table(failed);
}

main().catch(console.error);

