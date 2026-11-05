-- =====================================================================
-- xor — database schema
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- It is safe to re-run: it drops and recreates functions/policies,
-- but tables are only created if missing.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  created_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$')
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 280),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  secret_key text not null unique,
  leaderboard_epoch int not null default 1,
  cover text check (cover is null or cover ~ '^[a-z0-9-]{1,24}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_user on public.room_members (user_id);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  file_path text,
  file_size bigint,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'failed')),
  content text,              -- AI-extracted study notes (what questions are generated from)
  page_count int,
  error text,
  processing_started_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists materials_room on public.materials (room_id, created_at desc);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  material_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists decks_room on public.decks (room_id, created_at desc);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  position int not null,
  front text not null,
  back text not null
);
create index if not exists cards_deck on public.cards (deck_id, position);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  material_ids uuid[] not null default '{}',
  question_types text[] not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'mixed')),
  question_count int not null,
  time_limit_minutes int check (time_limit_minutes is null or time_limit_minutes between 1 and 240),
  max_score numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quizzes_room on public.quizzes (room_id, created_at desc);

-- Questions are visible to room members. Answers live in a separate table
-- that only the server can read, so nobody can peek at answers.
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position int not null,
  qtype text not null,
  prompt text not null,
  choices jsonb,              -- multiple choice options, matching columns, enumeration count
  points numeric not null default 1
);
create index if not exists quiz_questions_quiz on public.quiz_questions (quiz_id, position);

create table if not exists public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  answer jsonb not null,
  explanation text
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  epoch int not null,
  counts boolean not null default false,  -- true only for the first attempt (per leaderboard season)
  status text not null default 'in_progress' check (status in ('in_progress', 'grading', 'graded')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  max_score numeric
);
create unique index if not exists attempts_one_counting
  on public.attempts (quiz_id, user_id, epoch) where counts;
create index if not exists attempts_user on public.attempts (user_id, started_at desc);
create index if not exists attempts_quiz on public.attempts (quiz_id);

create table if not exists public.attempt_answers (
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  response jsonb,
  is_correct boolean,
  points numeric not null default 0,
  feedback text,
  primary key (attempt_id, question_id)
);

create table if not exists public.reset_polls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  started_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'passed', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours'
);
create unique index if not exists reset_polls_one_open on public.reset_polls (room_id) where status = 'open';

create table if not exists public.reset_votes (
  poll_id uuid not null references public.reset_polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  approve boolean not null,
  voted_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

-- server-only bookkeeping
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user on public.usage_events (user_id, kind, created_at desc);

create table if not exists public.join_failures (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists join_failures_user on public.join_failures (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- New user → profile row
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can use them
-- without recursion)
-- ---------------------------------------------------------------------

create or replace function public.is_room_member(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members where room_id = p_room and user_id = auth.uid()
  );
$$;

create or replace function public.is_room_owner(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.rooms where id = p_room and owner_id = auth.uid()
  );
$$;

create or replace function public.shares_room(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.room_members a
    join public.room_members b on a.room_id = b.room_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

create or replace function public.gen_room_key()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  raw text := '';
  candidate text;
  i int;
begin
  loop
    bytes := gen_random_bytes(8);
    raw := '';
    for i in 0..7 loop
      raw := raw || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    end loop;
    candidate := 'XOR-' || substr(raw, 1, 4) || '-' || substr(raw, 5, 4);
    exit when not exists (select 1 from public.rooms where secret_key = candidate);
  end loop;
  return candidate;
end $$;

-- ---------------------------------------------------------------------
-- Room actions (RPCs)
-- ---------------------------------------------------------------------

create or replace function public.create_room(p_name text, p_description text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_room uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and username is not null) then
    raise exception 'Pick a username first.';
  end if;
  insert into public.rooms (name, description, owner_id, secret_key)
  values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''), auth.uid(), public.gen_room_key())
  returning id into v_room;
  insert into public.room_members (room_id, user_id, role) values (v_room, auth.uid(), 'owner');
  return v_room;
end $$;

create or replace function public.join_room(p_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_room uuid;
  v_clean text := regexp_replace(upper(coalesce(p_key, '')), '[^A-Z0-9]', '', 'g');
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and username is not null) then
    raise exception 'Pick a username first.';
  end if;
  if (select count(*) from public.join_failures
      where user_id = auth.uid() and created_at > now() - interval '10 minutes') >= 8 then
    raise exception 'Too many wrong keys. Try again in 10 minutes.';
  end if;

  select id into v_room from public.rooms
  where regexp_replace(secret_key, '[^A-Z0-9]', '', 'g') = v_clean;

  if v_room is null then
    -- record the miss (no exception, so the insert isn't rolled back);
    -- the app shows "no room matches" when this returns null
    insert into public.join_failures (user_id) values (auth.uid());
    return null;
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (v_room, auth.uid(), 'member')
  on conflict do nothing;
  return v_room;
end $$;

create or replace function public.regenerate_room_key(p_room uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_key text;
begin
  if not public.is_room_owner(p_room) then raise exception 'Only the room owner can do this.'; end if;
  v_key := public.gen_room_key();
  update public.rooms set secret_key = v_key where id = p_room;
  return v_key;
end $$;

-- Only the owner can see the key (the column itself is hidden from clients, see bottom)
create or replace function public.get_room_key(p_room uuid)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_room_owner(p_room) then raise exception 'Only the room owner can see the key.'; end if;
  return (select secret_key from public.rooms where id = p_room);
end $$;

drop function if exists public.update_room(uuid, text, text);
create or replace function public.update_room(p_room uuid, p_name text, p_description text, p_cover text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_room_owner(p_room) then raise exception 'Only the room owner can do this.'; end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Give the room a name.'; end if;
  update public.rooms
  set name = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), ''),
      cover = coalesce(nullif(trim(coalesce(p_cover, '')), ''), cover)
  where id = p_room;
end $$;

create or replace function public.remove_member(p_room uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user = auth.uid() then
    if public.is_room_owner(p_room) then
      raise exception 'Owners can''t leave their own room. Delete the room instead.';
    end if;
  elsif not public.is_room_owner(p_room) then
    raise exception 'Only the room owner can remove members.';
  end if;
  delete from public.room_members where room_id = p_room and user_id = p_user and role <> 'owner';
end $$;

-- ---------------------------------------------------------------------
-- Leaderboards
-- ---------------------------------------------------------------------

create or replace function public.quiz_leaderboard(p_quiz uuid)
returns table (user_id uuid, username text, score numeric, max_score numeric, submitted_at timestamptz, rank bigint)
language sql stable security definer set search_path = public as $$
  select a.user_id, p.username, a.score, a.max_score, a.submitted_at,
         rank() over (order by a.score desc, a.submitted_at asc) as rank
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  join public.rooms r on r.id = q.room_id
  join public.profiles p on p.id = a.user_id
  where a.quiz_id = p_quiz
    and a.counts and a.status = 'graded'
    and a.epoch = r.leaderboard_epoch
    and public.is_room_member(q.room_id)
  order by rank, p.username;
$$;

create or replace function public.room_leaderboard(p_room uuid)
returns table (user_id uuid, username text, total_points numeric, quizzes_taken bigint, avg_percent numeric, rank bigint)
language sql stable security definer set search_path = public as $$
  with r as (select leaderboard_epoch from public.rooms where id = p_room),
  s as (
    select a.user_id,
           sum(a.score) as total_points,
           count(*) as quizzes_taken,
           round(avg(case when a.max_score > 0 then a.score / a.max_score * 100 end), 1) as avg_percent
    from public.attempts a, r
    where a.room_id = p_room and a.counts and a.status = 'graded' and a.epoch = r.leaderboard_epoch
    group by a.user_id
  )
  select m.user_id, p.username,
         coalesce(s.total_points, 0), coalesce(s.quizzes_taken, 0), s.avg_percent,
         rank() over (order by coalesce(s.total_points, 0) desc, coalesce(s.quizzes_taken, 0) desc)
  from public.room_members m
  join public.profiles p on p.id = m.user_id
  left join s on s.user_id = m.user_id
  where m.room_id = p_room and public.is_room_member(p_room)
  order by 6, p.username;
$$;

-- ---------------------------------------------------------------------
-- Leaderboard reset: owner starts a vote, passes on a strict majority
-- of current members. Resetting starts a new "season" (epoch), so
-- everyone's next attempt on any quiz counts again.
-- ---------------------------------------------------------------------

create or replace function public.check_reset_poll(p_poll uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_poll public.reset_polls;
  v_members int;
  v_yes int;
begin
  select * into v_poll from public.reset_polls where id = p_poll;
  if v_poll.status <> 'open' then return v_poll.status; end if;
  if now() > v_poll.expires_at then
    update public.reset_polls set status = 'expired' where id = p_poll;
    return 'expired';
  end if;
  select count(*) into v_members from public.room_members where room_id = v_poll.room_id;
  select count(*) into v_yes from public.reset_votes v
    join public.room_members m on m.user_id = v.user_id and m.room_id = v_poll.room_id
    where v.poll_id = p_poll and v.approve;
  if v_yes * 2 > v_members then
    update public.reset_polls set status = 'passed' where id = p_poll;
    update public.rooms set leaderboard_epoch = leaderboard_epoch + 1 where id = v_poll.room_id;
    return 'passed';
  end if;
  return 'open';
end $$;

create or replace function public.start_reset_poll(p_room uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_poll uuid; v_open uuid;
begin
  if not public.is_room_owner(p_room) then raise exception 'Only the room owner can start a reset vote.'; end if;
  select id into v_open from public.reset_polls where room_id = p_room and status = 'open';
  if v_open is not null then
    if public.check_reset_poll(v_open) = 'open' then
      raise exception 'A reset vote is already running.';
    end if;
  end if;
  insert into public.reset_polls (room_id, started_by) values (p_room, auth.uid()) returning id into v_poll;
  insert into public.reset_votes (poll_id, user_id, approve) values (v_poll, auth.uid(), true);
  perform public.check_reset_poll(v_poll);
  return v_poll;
end $$;

create or replace function public.cast_reset_vote(p_poll uuid, p_approve boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_room uuid; v_status text;
begin
  select room_id into v_room from public.reset_polls where id = p_poll;
  if v_room is null or not public.is_room_member(v_room) then raise exception 'Vote not found.'; end if;
  v_status := public.check_reset_poll(p_poll);
  if v_status <> 'open' then return v_status; end if;
  insert into public.reset_votes (poll_id, user_id, approve) values (p_poll, auth.uid(), p_approve)
  on conflict (poll_id, user_id) do update set approve = excluded.approve, voted_at = now();
  return public.check_reset_poll(p_poll);
end $$;

create or replace function public.cancel_reset_poll(p_poll uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_room uuid;
begin
  select room_id into v_room from public.reset_polls where id = p_poll;
  if not public.is_room_owner(v_room) then raise exception 'Only the room owner can cancel the vote.'; end if;
  update public.reset_polls set status = 'cancelled' where id = p_poll and status = 'open';
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.materials enable row level security;
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security; -- no policies: server only
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.reset_polls enable row level security;
alter table public.reset_votes enable row level security;
alter table public.usage_events enable row level security;      -- no policies: server only
alter table public.join_failures enable row level security;     -- no policies: server only

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_room(id));
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "rooms read" on public.rooms;
create policy "rooms read" on public.rooms for select to authenticated
  using (public.is_room_member(id));

drop policy if exists "members read" on public.room_members;
create policy "members read" on public.room_members for select to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "materials read" on public.materials;
create policy "materials read" on public.materials for select to authenticated
  using (public.is_room_member(room_id));
drop policy if exists "materials insert" on public.materials;
create policy "materials insert" on public.materials for insert to authenticated
  with check (
    public.is_room_member(room_id) and uploaded_by = auth.uid()
    and status = 'uploaded' and content is null
    and file_path like room_id::text || '/%'
  );

drop policy if exists "decks read" on public.decks;
create policy "decks read" on public.decks for select to authenticated
  using (public.is_room_member(room_id));
drop policy if exists "decks delete" on public.decks;
create policy "decks delete" on public.decks for delete to authenticated
  using (created_by = auth.uid() or public.is_room_owner(room_id));

drop policy if exists "cards read" on public.cards;
create policy "cards read" on public.cards for select to authenticated
  using (exists (select 1 from public.decks d where d.id = deck_id and public.is_room_member(d.room_id)));

drop policy if exists "quizzes read" on public.quizzes;
create policy "quizzes read" on public.quizzes for select to authenticated
  using (public.is_room_member(room_id));
drop policy if exists "quizzes delete" on public.quizzes;
create policy "quizzes delete" on public.quizzes for delete to authenticated
  using (created_by = auth.uid() or public.is_room_owner(room_id));

drop policy if exists "questions read" on public.quiz_questions;
create policy "questions read" on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and public.is_room_member(q.room_id)));

drop policy if exists "attempts read own" on public.attempts;
create policy "attempts read own" on public.attempts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "answers read own" on public.attempt_answers;
create policy "answers read own" on public.attempt_answers for select to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));

drop policy if exists "polls read" on public.reset_polls;
create policy "polls read" on public.reset_polls for select to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "votes read" on public.reset_votes;
create policy "votes read" on public.reset_votes for select to authenticated
  using (exists (select 1 from public.reset_polls p where p.id = poll_id and public.is_room_member(p.room_id)));

-- Members can read room rows but not the secret key column
revoke select on public.rooms from anon, authenticated;
grant select (id, name, description, owner_id, leaderboard_epoch, created_at, cover) on public.rooms to authenticated;

-- Lock down helper/RPC execution to signed-in users
revoke execute on function public.gen_room_key() from public, anon, authenticated;
revoke execute on function public.check_reset_poll(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: private "materials" bucket for PDFs (50 MB max on free plan)
-- Files are stored as  <room_id>/<random>.pdf
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

drop policy if exists "materials upload" on storage.objects;
create policy "materials upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materials'
    and public.is_room_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "materials download" on storage.objects;
create policy "materials download" on storage.objects for select to authenticated
  using (
    bucket_id = 'materials'
    and public.is_room_member(((storage.foldername(name))[1])::uuid)
  );


-- ---------------------------------------------------------------------
-- "New" badges (same as migrations/003_notifications.sql)
-- ---------------------------------------------------------------------

create table if not exists public.room_seen (
  user_id uuid not null references public.profiles (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  section text not null check (section in ('materials', 'flashcards', 'quizzes', 'leaderboard', 'members')),
  seen_at timestamptz not null default now(),
  primary key (user_id, room_id, section)
);

alter table public.room_seen enable row level security;
drop policy if exists "seen read own" on public.room_seen;
create policy "seen read own" on public.room_seen for select to authenticated using (user_id = auth.uid());

-- Record that I just opened a section of a room.
create or replace function public.mark_seen(p_room uuid, p_section text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_room_member(p_room) then return; end if;
  insert into public.room_seen (user_id, room_id, section, seen_at)
  values (auth.uid(), p_room, p_section, now())
  on conflict (user_id, room_id, section) do update set seen_at = excluded.seen_at;
end $$;

-- How many new things per section, since I last opened it
-- (or since I joined, if I never opened it). My own actions never count.
create or replace function public.room_updates(p_room uuid)
returns table (section text, count bigint)
language sql stable security definer set search_path = public as $$
  with me as (
    select m.joined_at from public.room_members m
    where m.room_id = p_room and m.user_id = auth.uid()
  ),
  base as (
    select s.section, coalesce(seen.seen_at, me.joined_at) as since
    from me
    cross join (values ('materials'), ('flashcards'), ('quizzes'), ('leaderboard'), ('members')) as s(section)
    left join public.room_seen seen
      on seen.user_id = auth.uid() and seen.room_id = p_room and seen.section = s.section
  )
  select 'materials', count(*) from public.materials x, base b
    where b.section = 'materials' and x.room_id = p_room and x.uploaded_by <> auth.uid() and x.created_at > b.since
  union all
  select 'flashcards', count(*) from public.decks x, base b
    where b.section = 'flashcards' and x.room_id = p_room and x.created_by <> auth.uid() and x.created_at > b.since
  union all
  select 'quizzes', count(*) from public.quizzes x, base b
    where b.section = 'quizzes' and x.room_id = p_room and x.created_by <> auth.uid() and x.created_at > b.since
  union all
  select 'leaderboard', count(*) from public.attempts x, base b
    where b.section = 'leaderboard' and x.room_id = p_room and x.user_id <> auth.uid()
      and x.counts and x.status = 'graded' and x.submitted_at > b.since
  union all
  select 'members', count(*) from public.room_members x, base b
    where b.section = 'members' and x.room_id = p_room and x.user_id <> auth.uid() and x.joined_at > b.since;
$$;

-- Total new things per room, for the rooms list.
create or replace function public.rooms_with_updates()
returns table (room_id uuid, total bigint)
language sql stable security definer set search_path = public as $$
  select m.room_id, (select coalesce(sum(u.count), 0) from public.room_updates(m.room_id) u)::bigint
  from public.room_members m
  where m.user_id = auth.uid();
$$;

-- xor migration 004: everyone picks their own room card design
-- The design is saved per person (room_members.cover), so changing it
-- only changes how the card looks for you. rooms.cover stays as the
-- starting design for anyone who hasn't picked one yet.

alter table public.room_members
  add column if not exists cover text;

alter table public.room_members
  drop constraint if exists room_members_cover_format;
alter table public.room_members
  add constraint room_members_cover_format check (cover is null or cover ~ '^[a-z0-9-]{1,24}$');

create or replace function public.set_my_cover(p_room uuid, p_cover text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_cover is not null and p_cover !~ '^[a-z0-9-]{1,24}$' then raise exception 'Unknown design.'; end if;
  update public.room_members set cover = p_cover
  where room_id = p_room and user_id = auth.uid();
  if not found then raise exception 'You are not in this room.'; end if;
end $$;

revoke all on function public.set_my_cover(uuid, text) from public;
grant execute on function public.set_my_cover(uuid, text) to authenticated;
