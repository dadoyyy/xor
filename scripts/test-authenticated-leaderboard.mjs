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
    create table if not exists storage.buckets (id text primary key, name text);
    create table if not exists storage.objects (id uuid primary key, bucket_id text, name text, owner uuid);
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
    end $$;
    grant usage on schema public to authenticated;
  `);

  await db.exec(fs.readFileSync("backups/backup_20261108.sql", "utf8"));
  await db.exec("insert into auth.users (id) select id from public.profiles on conflict do nothing;");
  await db.exec(fs.readFileSync("supabase/migrations/005_user_first_subjects.sql", "utf8"));

  // Check 'test room' with owner (xorreur)
  const xorreurId = "42471a40-f26f-4577-ab80-5ffa41785d29";
  const testRoomId = "c4745447-9189-47c6-89b6-ba2bde65cfc6";

  await db.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${xorreurId}', true);
  `);

  const lbTestRoom = await db.query(`select * from public.subject_leaderboard('${testRoomId}');`);
  console.log("Leaderboard for 'test room' viewed by xorreur (OWNER):");
  console.table(lbTestRoom.rows);

  // Check 'Nihongo' (moxkw and nuggets and xorreur)
  const nihongoId = "108c9f95-79ab-4df0-8791-d1d1646e800b";
  const lbNihongo = await db.query(`select * from public.subject_leaderboard('${nihongoId}');`);
  console.log("Leaderboard for 'Nihongo' viewed by xorreur (EDITOR):");
  console.table(lbNihongo.rows);

  // Check 'SubSpace-1' (Tim and xorreur)
  const subspaceId = "56eba5e8-fa27-4da4-a818-01634256e768";
  const lbSubspace = await db.query(`select * from public.subject_leaderboard('${subspaceId}');`);
  console.log("Leaderboard for 'SubSpace-1' viewed by xorreur (EDITOR):");
  console.table(lbSubspace.rows);

  // Check outsider viewing 'test room'
  const outsiderId = "fa3d616f-edca-44aa-9fc4-cda43ac702ef";
  await db.exec(`select set_config('request.jwt.claim.sub', '${outsiderId}', true);`);
  const lbOutsider = await db.query(`select * from public.subject_leaderboard('${testRoomId}');`);
  console.log("Leaderboard for 'test room' viewed by OUTSIDER (should be 0 rows):");
  console.table(lbOutsider.rows);

  await db.close();
}

main().catch(console.error);
