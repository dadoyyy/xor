import { PGlite } from "@electric-sql/pglite";

async function run() {
  console.log("=== REPRODUCING ONBOARDING RLS ERROR SCENARIOS ===");
  const pg = new PGlite();

  // Create roles
  await pg.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon;
      end if;
    end $$;
    
    create table if not exists public.profiles (
      id uuid primary key,
      username text,
      created_at timestamptz not null default now(),
      constraint username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$')
    );
    create unique index if not exists profiles_username_lower on public.profiles (lower(username));
    
    alter table public.profiles enable row level security;
    grant all on public.profiles to authenticated, anon;
    
    -- Original schema policies (v1/rooms):
    create policy "profiles read" on public.profiles for select to authenticated
      using (true);
    create policy "profiles update own" on public.profiles for update to authenticated
      using (id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid)
      with check (id = nullif(current_setting('request.jwt.claim.sub', true), '')::uuid);
  `);

  const cleanUserId = "11111111-1111-1111-1111-111111111111";

  // CASE 1: Clean user with NO profile row (trigger didn't run) tries to INSERT as authenticated user
  console.log("\n--- Scenario 1: Clean user with no profile row runs INSERT via authenticated client ---");
  try {
    await pg.exec(`
      set role authenticated;
      select set_config('request.jwt.claim.sub', '${cleanUserId}', false);
      insert into public.profiles (id, username) values ('${cleanUserId}', 'testuser');
    `);
    console.log("Scenario 1 unexpectedly succeeded");
  } catch (err) {
    console.log("Scenario 1 Postgres Error:", err.message);
    console.log("Error code:", err.code);
  }

  // CASE 2: Client with undefined service role key (anon fallback) tries to provision profile
  console.log("\n--- Scenario 2: Unauthenticated/Anon client (missing service role key fallback) tries to INSERT profile ---");
  try {
    await pg.exec(`
      set role anon;
      select set_config('request.jwt.claim.sub', '', false);
      insert into public.profiles (id, username) values ('${cleanUserId}', 'testuser');
    `);
    console.log("Scenario 2 unexpectedly succeeded");
  } catch (err) {
    console.log("Scenario 2 Postgres Error:", err.message);
    console.log("Error code:", err.code);
  }

  // CASE 3: Clean user tries to UPDATE when no row exists
  console.log("\n--- Scenario 3: Clean user runs UPDATE when no row exists in profiles ---");
  await pg.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${cleanUserId}', false);
  `);
  const updateRes = await pg.query(`
    update public.profiles set username = 'testuser' where id = '${cleanUserId}' returning id;
  `);
  console.log("Update affected rows:", updateRes.rows.length, "(returns empty array, no row updated)");

  // CASE 4: The 005 security definer fix
  console.log("\n--- Scenario 4: Fixed via security definer RPC set_my_username or service_role admin client ---");
  await pg.exec(`
    reset role;
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid language sql as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create or replace function public.set_my_username(p_username text)
    returns text
    language plpgsql
    security definer set search_path = public
    as $$
    declare
      v_uid uuid := auth.uid();
    begin
      insert into public.profiles (id, username)
      values (v_uid, p_username)
      on conflict (id) do update set username = excluded.username;
      return p_username;
    end;
    $$;

    grant execute on function public.set_my_username(text) to authenticated;
  `);

  await pg.exec(`
    set role authenticated;
    select set_config('request.jwt.claim.sub', '${cleanUserId}', false);
  `);
  const rpcRes = await pg.query(`select public.set_my_username('testuser') as username;`);
  console.log("Scenario 4 Result via security definer:", rpcRes.rows);

  const profileAfter = await pg.query(`select * from public.profiles where id = '${cleanUserId}';`);
  console.log("Profile after set_my_username:", profileAfter.rows);
}

run().catch(console.error);
