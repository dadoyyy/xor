-- =====================================================================
-- xor — Pre-005 Staging Seed & Supabase Environment Bootstrap
-- Sets up minimal Supabase schemas (auth, storage, extensions, roles),
-- the pre-005 room-first schema (001..004), and realistic seed data
-- for rehearsing 005 UP -> 005 DOWN -> 005 UP + 005_verification.sql.
-- =====================================================================

begin;

-- 1. Supabase Roles & Extensions
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
end $$;

create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- 2. Minimal Supabase `auth` schema & `auth.uid()`
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

-- 3. Minimal Supabase `storage` schema (`buckets`, `objects`, `foldername`)
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id) on delete cascade,
  name text not null,
  owner uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (bucket_id, name)
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[] language sql immutable as $$
  select string_to_array(name, '/');
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

-- 4. Pre-005 Room-First Schema (001 + 002 + 003 + 004)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (
    username is null or (
      char_length(username) between 3 and 24
      and username ~ '^[a-zA-Z0-9_]+$'
    )
  ),
  created_at timestamptz not null default now()
);

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

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 240),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  secret_key text not null unique,
  leaderboard_epoch int not null default 1,
  cover text check (cover is null or cover ~ '^[a-z0-9-]{1,24}$'),
  created_at timestamptz not null default now(),
  constraint rooms_cover_format check (cover is null or cover ~ '^[a-z0-9-]{1,24}$')
);

create table if not exists public.room_members (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  cover text,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id),
  constraint room_members_role_check check (role in ('owner', 'member')),
  constraint room_members_cover_format check (cover is null or cover ~ '^[a-z0-9-]{1,24}$')
);
create index if not exists room_members_user on public.room_members (user_id);

create table if not exists public.join_failures (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists join_failures_user_time on public.join_failures (user_id, created_at desc);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  file_path text not null,
  page_count int,
  content jsonb,
  status text not null default 'uploaded' check (status in ('uploaded', 'extracting', 'ready', 'failed')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists materials_room on public.materials (room_id, created_at desc);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz not null default now()
);
create index if not exists decks_room on public.decks (room_id, created_at desc);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  position int not null,
  front text not null,
  back text not null,
  hint text,
  tag text
);
create index if not exists cards_deck on public.cards (deck_id, position);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  question_types text[] not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question_count int not null,
  max_score numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quizzes_room on public.quizzes (room_id, created_at desc);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position int not null,
  qtype text not null check (
    qtype in ('multiple_choice', 'true_false', 'identification', 'enumeration', 'fill_blank', 'essay')
  ),
  prompt text not null,
  choices jsonb,
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
  counts boolean not null default false,
  status text not null default 'in_progress' check (status in ('in_progress', 'grading', 'graded')),
  score numeric not null default 0,
  max_score numeric not null default 0,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);
create unique index if not exists attempts_first_per_epoch
  on public.attempts (quiz_id, user_id, epoch)
  where counts = true;
create index if not exists attempts_quiz_user on public.attempts (quiz_id, user_id, submitted_at desc);

create table if not exists public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  response jsonb not null,
  points_awarded numeric not null default 0,
  is_correct boolean not null default false,
  feedback text,
  unique (attempt_id, question_id)
);
create index if not exists attempt_answers_attempt on public.attempt_answers (attempt_id);

create table if not exists public.reset_polls (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  started_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'passed', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create unique index if not exists reset_polls_one_open
  on public.reset_polls (room_id)
  where status = 'open';

create table if not exists public.reset_votes (
  poll_id uuid not null references public.reset_polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  approve boolean not null,
  voted_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create table if not exists public.room_seen (
  user_id uuid not null references public.profiles (id) on delete cascade,
  room_id uuid not null references public.rooms (id) on delete cascade,
  section text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, room_id, section),
  constraint room_seen_section_check check (section in ('materials', 'flashcards', 'quizzes', 'leaderboard', 'members'))
);

create table if not exists public.usage_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('extract', 'flashcards', 'quiz', 'grade')),
  created_at timestamptz not null default now()
);
create index if not exists usage_events_user_time on public.usage_events (user_id, kind, created_at desc);

-- Grant base schema & table permissions to authenticated/anon (matching Supabase default grants)
grant usage on schema public, storage, auth, extensions to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

-- 5. Seed Users, Room, Member, Material, Deck, Quiz, and Counting Attempt
insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-000000000001', 'owner@xor.test'),
  ('00000000-0000-0000-0000-000000000002', 'member@xor.test'),
  ('00000000-0000-0000-0000-000000000003', 'viewer@xor.test'),
  ('00000000-0000-0000-0000-000000000004', 'outsider@xor.test'),
  ('00000000-0000-0000-0000-000000000005', 'manila@xor.test'),
  ('00000000-0000-0000-0000-000000000006', 'newyork@xor.test')
on conflict (id) do nothing;

update public.profiles set username = 'owner_corgi' where id = '00000000-0000-0000-0000-000000000001';
update public.profiles set username = 'former_member' where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set username = 'key_viewer' where id = '00000000-0000-0000-0000-000000000003';
update public.profiles set username = 'outsider_user' where id = '00000000-0000-0000-0000-000000000004';
update public.profiles set username = 'manila_student' where id = '00000000-0000-0000-0000-000000000005';
update public.profiles set username = 'ny_student' where id = '00000000-0000-0000-0000-000000000006';

insert into public.rooms (id, name, description, owner_id, secret_key, leaderboard_epoch, cover)
values (
  '00000000-0000-0000-0000-000000000101',
  'Cellular Energetics & Bio',
  'Seeded room for 005 migration rehearsal',
  '00000000-0000-0000-0000-000000000001',
  'XOR-BIO1-2026',
  1,
  'lilac'
);

insert into public.room_members (room_id, user_id, role)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 'member');

insert into public.materials (id, room_id, uploaded_by, title, file_path, page_count, status)
values (
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'Lecture 1: ATP & Glycolysis',
  '00000000-0000-0000-0000-000000000101/lecture1.pdf',
  12,
  'ready'
);

insert into public.decks (id, room_id, material_id, created_by, title, difficulty)
values (
  '00000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000001',
  'Glycolysis Flashcards',
  'medium'
);

insert into public.cards (deck_id, position, front, back)
values
  ('00000000-0000-0000-0000-000000000501', 0, 'Where does glycolysis occur?', 'Cytosol'),
  ('00000000-0000-0000-0000-000000000501', 1, 'Net ATP from glycolysis?', '2 ATP');

insert into public.quizzes (id, room_id, material_id, created_by, title, question_types, difficulty, question_count, max_score)
values (
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000001',
  'Bio Quiz 1',
  array['multiple_choice'],
  'medium',
  1,
  10
);

insert into public.quiz_questions (id, quiz_id, position, qtype, prompt, choices, points)
values (
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000201',
  0,
  'multiple_choice',
  'Which organelle produces the majority of cellular ATP?',
  '["Ribosome", "Mitochondrion", "Golgi apparatus", "Peroxisome"]'::jsonb,
  10
);

insert into public.quiz_answer_keys (question_id, answer, explanation)
values (
  '00000000-0000-0000-0000-000000000301',
  '{"index": 1}'::jsonb,
  'Mitochondria generate ATP via oxidative phosphorylation.'
);

insert into public.attempts (id, quiz_id, room_id, user_id, epoch, counts, status, score, max_score, started_at, submitted_at)
values (
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000201',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  1,
  true,
  'graded',
  8,
  10,
  now() - interval '5 minutes',
  now() - interval '1 minute'
);

insert into public.room_seen (user_id, room_id, section)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'members'
);

commit;

