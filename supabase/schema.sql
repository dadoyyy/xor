-- =====================================================================
-- xor — database schema (user-first architecture)
-- Run this whole file once in Supabase → SQL Editor → New query → Run.
-- For existing room-first databases, run supabase/migrations/005_user_first_subjects.sql.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  timezone text not null default 'UTC',
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_active_date date,
  created_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$')
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 280),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  share_key text not null unique,
  share_enabled boolean not null default true,
  allow_fork boolean not null default true,
  forked_from_id uuid references public.subjects (id) on delete set null,
  forked_from_name text,
  forked_from_owner_id uuid references public.profiles (id) on delete set null,
  leaderboard_epoch int not null default 1,
  cover text check (cover is null or cover ~ '^[a-z0-9-]{1,24}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subjects_owner_idx on public.subjects (owner_id, created_at desc);
create index if not exists subjects_forked_from_idx on public.subjects (forked_from_id) where forked_from_id is not null;

create table if not exists public.library_entries (
  subject_id uuid not null references public.subjects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  cover text check (cover is null or cover ~ '^[a-z0-9-]{1,24}$'),
  pinned boolean not null default false,
  added_at timestamptz not null default now(),
  last_opened_at timestamptz,
  primary key (subject_id, user_id)
);
create index if not exists library_entries_user on public.library_entries (user_id);
create index if not exists library_entries_user_pinned_idx on public.library_entries (user_id, pinned desc, added_at desc);
create index if not exists library_entries_subject_role_idx on public.library_entries (subject_id, role);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  source_type text not null default 'pdf' check (source_type in ('pdf', 'text')),
  forked_from_id uuid references public.materials (id) on delete set null,
  file_path text,
  file_size bigint,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'ready', 'failed')),
  content text,              -- AI-extracted or imported study notes
  page_count int,
  error text,
  processing_started_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists materials_subject on public.materials (subject_id, created_at desc);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  source_type text not null default 'ai' check (source_type in ('ai', 'import')),
  forked_from_id uuid references public.decks (id) on delete set null,
  material_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists decks_subject on public.decks (subject_id, created_at desc);

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
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  source_type text not null default 'ai' check (source_type in ('ai', 'import')),
  forked_from_id uuid references public.quizzes (id) on delete set null,
  material_ids uuid[] not null default '{}',
  question_types text[] not null,
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard', 'mixed')),
  question_count int not null,
  time_limit_minutes int check (time_limit_minutes is null or time_limit_minutes between 1 and 240),
  max_score numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists quizzes_subject on public.quizzes (subject_id, created_at desc);

-- Questions are visible to subject members. Answers live in a separate table
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
  subject_id uuid not null references public.subjects (id) on delete cascade,
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
create index if not exists attempts_subject_scoring_idx
  on public.attempts (subject_id, epoch, user_id) where counts = true and status = 'graded';
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
  subject_id uuid not null references public.subjects (id) on delete cascade,
  started_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'passed', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours'
);
create unique index if not exists reset_polls_one_open_subject on public.reset_polls (subject_id) where status = 'open';

create table if not exists public.reset_votes (
  poll_id uuid not null references public.reset_polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  approve boolean not null,
  voted_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

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
create index if not exists activity_days_user_date_idx on public.activity_days (user_id, activity_date desc);
create index if not exists activity_days_user_qualifying_idx on public.activity_days (user_id, activity_date desc) where qualifies_for_streak = true;

create table if not exists public.study_activity_events (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  source_type text not null check (source_type in ('quiz_completed', 'cards_reviewed', 'material_added')),
  source_id uuid not null,
  points numeric not null default 0 check (points >= 0),
  created_at timestamptz not null default now()
);
create unique index if not exists study_activity_once_per_source_idx
  on public.study_activity_events (user_id, source_type, source_id)
  where source_type in ('quiz_completed', 'material_added');
create unique index if not exists study_activity_card_per_day_idx
  on public.study_activity_events (user_id, activity_date, source_id)
  where source_type = 'cards_reviewed';

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  event_type text not null default 'assignment' check (event_type in ('assignment', 'project', 'backlog', 'exam')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  due_time time,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calendar_events_user_due_idx on public.calendar_events (user_id, due_date asc nulls last, status);
create index if not exists calendar_events_user_status_idx on public.calendar_events (user_id, status, event_type);
create index if not exists calendar_events_subject_idx on public.calendar_events (subject_id) where subject_id is not null;

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

create table if not exists public.subject_seen (
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  section text not null check (section in ('materials', 'flashcards', 'quizzes', 'leaderboard', 'sharing', 'members')),
  seen_at timestamptz not null default now(),
  primary key (user_id, subject_id, section)
);

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
-- Timezone & Streak Functions
-- ---------------------------------------------------------------------

create or replace function public.user_local_date(p_user uuid, p_ts timestamptz default now())
returns date language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text;
begin
  select coalesce(nullif(trim(timezone), ''), 'UTC') into v_tz
  from public.profiles
  where id = p_user;

  if v_tz is null or not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;

  return (coalesce(p_ts, now()) at time zone v_tz)::date;
end $$;

create or replace function public.recompute_user_streak(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_today date := public.user_local_date(p_user, now());
  v_prev date := null;
  v_d date;
  v_run int := 0;
  v_longest int := 0;
  v_current int := 0;
  v_last date := null;
begin
  for v_d in
    select activity_date
    from public.activity_days
    where user_id = p_user and qualifies_for_streak = true
    order by activity_date asc
  loop
    if v_prev is null or v_d = v_prev + 1 then
      v_run := v_run + 1;
    elsif v_d > v_prev + 1 then
      v_run := 1;
    end if;

    if v_run > v_longest then
      v_longest := v_run;
    end if;

    v_prev := v_d;
    v_last := v_d;
  end loop;

  if v_last is not null and v_last >= v_today - 1 then
    v_current := v_run;
  else
    v_current := 0;
  end if;

  update public.profiles
  set current_streak = v_current,
      longest_streak = v_longest,
      last_active_date = v_last
  where id = p_user;
end $$;

create or replace function public.record_study_activity(
  p_user uuid,
  p_kind text,
  p_count int default 1,
  p_points numeric default 0,
  p_source_id uuid default null
)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_date date;
  v_inc int := greatest(coalesce(p_count, 1), 0);
  v_pts numeric := greatest(coalesce(p_points, 0), 0);
  v_inserted int := 1;
begin
  if p_user is null or v_inc <= 0 then
    return false;
  end if;

  if p_kind not in ('quiz_completed', 'cards_reviewed', 'material_added') then
    raise exception 'Invalid study activity kind: %', p_kind;
  end if;

  v_date := public.user_local_date(p_user, now());

  if p_source_id is not null then
    if p_kind in ('quiz_completed', 'material_added') then
      insert into public.study_activity_events (user_id, activity_date, source_type, source_id, points)
      values (p_user, v_date, p_kind, p_source_id, v_pts)
      on conflict (user_id, source_type, source_id)
      where source_type in ('quiz_completed', 'material_added')
      do nothing;
      get diagnostics v_inserted = row_count;
      if v_inserted = 0 then
        return false;
      end if;
      v_inc := 1;
    elsif p_kind = 'cards_reviewed' then
      insert into public.study_activity_events (user_id, activity_date, source_type, source_id, points)
      values (p_user, v_date, 'cards_reviewed', p_source_id, 0)
      on conflict (user_id, activity_date, source_id)
      where source_type = 'cards_reviewed'
      do nothing;
      get diagnostics v_inserted = row_count;
      if v_inserted = 0 then
        return false;
      end if;
      v_inc := 1;
    end if;
  end if;

  insert into public.activity_days (
    user_id,
    activity_date,
    quizzes_completed,
    cards_reviewed,
    materials_added,
    points_earned,
    updated_at
  )
  values (
    p_user,
    v_date,
    case when p_kind = 'quiz_completed' then v_inc else 0 end,
    case when p_kind = 'cards_reviewed' then v_inc else 0 end,
    case when p_kind = 'material_added' then v_inc else 0 end,
    v_pts,
    now()
  )
  on conflict (user_id, activity_date) do update
  set quizzes_completed = public.activity_days.quizzes_completed
        + (case when p_kind = 'quiz_completed' then v_inc else 0 end),
      cards_reviewed = public.activity_days.cards_reviewed
        + (case when p_kind = 'cards_reviewed' then v_inc else 0 end),
      materials_added = public.activity_days.materials_added
        + (case when p_kind = 'material_added' then v_inc else 0 end),
      points_earned = public.activity_days.points_earned + v_pts,
      updated_at = now();

  perform public.recompute_user_streak(p_user);
  return true;
end $$;

create or replace function public.record_deck_card_reviews(
  p_deck uuid,
  p_card_ids uuid[]
)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_subject uuid;
  v_distinct_ids uuid[];
  v_valid_count int;
  v_date date;
  v_new_cards int := 0;
begin
  if v_user is null then
    raise exception 'Sign in first.';
  end if;

  if p_card_ids is null or coalesce(array_length(p_card_ids, 1), 0) = 0 then
    raise exception 'Provide at least one card ID.';
  end if;

  if array_length(p_card_ids, 1) > 100 then
    raise exception 'Too many cards in a single review request (max 100).';
  end if;

  select d.subject_id into v_subject
  from public.decks d
  where d.id = p_deck;

  if v_subject is null then
    raise exception 'Deck not found.';
  end if;

  if not public.has_subject_access(v_subject) then
    raise exception 'You do not have access to this deck.';
  end if;

  select array_agg(distinct u.cid) into v_distinct_ids
  from unnest(p_card_ids) as u(cid)
  where u.cid is not null;

  if v_distinct_ids is null or coalesce(array_length(v_distinct_ids, 1), 0) = 0 then
    raise exception 'Provide at least one valid card ID.';
  end if;

  select count(*) into v_valid_count
  from public.cards c
  where c.deck_id = p_deck
    and c.id = any(v_distinct_ids);

  if v_valid_count <> array_length(v_distinct_ids, 1) then
    raise exception 'One or more card IDs do not belong to this deck.';
  end if;

  v_date := public.user_local_date(v_user, now());

  with inserted as (
    insert into public.study_activity_events (user_id, activity_date, source_type, source_id, points)
    select v_user, v_date, 'cards_reviewed', cid, 0
    from unnest(v_distinct_ids) as cid
    on conflict (user_id, activity_date, source_id)
    where source_type = 'cards_reviewed'
    do nothing
    returning 1
  )
  select count(*)::int into v_new_cards from inserted;

  if v_new_cards > 0 then
    insert into public.activity_days (
      user_id,
      activity_date,
      quizzes_completed,
      cards_reviewed,
      materials_added,
      points_earned,
      updated_at
    )
    values (v_user, v_date, 0, v_new_cards, 0, 0, now())
    on conflict (user_id, activity_date) do update
    set cards_reviewed = public.activity_days.cards_reviewed + v_new_cards,
        updated_at = now();

    perform public.recompute_user_streak(v_user);
  end if;

  return v_new_cards;
end $$;

create or replace function public.set_my_timezone(p_timezone text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_tz text := trim(coalesce(p_timezone, ''));
  v_updated int := 0;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if v_tz = '' or char_length(v_tz) > 64 then
    raise exception 'Invalid timezone.';
  end if;
  if v_tz not in ('UTC', 'Etc/UTC', 'Etc/GMT')
     and (v_tz !~ '^[A-Za-z]+/[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)?$' or v_tz ~* '^(posix|right|SystemV)/') then
    raise exception 'Invalid IANA timezone.';
  end if;
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    raise exception 'Invalid IANA timezone.';
  end if;

  update public.profiles
  set timezone = v_tz
  where id = auth.uid()
    and timezone is distinct from v_tz;

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end $$;

create or replace function public.set_my_username(p_username text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_clean text := trim(coalesce(p_username, ''));
  v_lower text;
  v_reserved text[] := array[
    'admin', 'administrator', 'system', 'root', 'support', 'help', 'api',
    'bot', 'moderator', 'staff', 'xor', 'team', 'auth', 'login', 'signup',
    'onboarding', 'settings', 'null', 'undefined', 'anonymous', 'official',
    'library', 'subjects', 'rooms', 'calendar', 'progress'
  ];
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if char_length(v_clean) < 3 or char_length(v_clean) > 20 then
    raise exception 'Username must be between 3 and 20 characters.';
  end if;
  if v_clean !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Username can only contain letters, numbers, and underscores.';
  end if;

  v_lower := lower(v_clean);
  if v_lower = any(v_reserved) then
    raise exception 'This username is reserved. Please pick another.';
  end if;

  -- Atomic insert or update with race condition handling
  begin
    insert into public.profiles (id, username)
    values (auth.uid(), v_clean)
    on conflict (id) do update set username = v_clean;
  exception when unique_violation then
    raise exception 'That username is already taken. Try another.';
  end;

  return v_clean;
end $$;

-- ---------------------------------------------------------------------
-- Quiz Fairness Lock Trigger
-- ---------------------------------------------------------------------

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

  if v_quiz_id is not null and public.quiz_has_counting_attempt(v_quiz_id) then
    raise exception 'This quiz already has leaderboard attempts and its questions are locked to preserve fairness.';
  end if;

  return new;
end $$;

drop trigger if exists trg_lock_quiz_questions on public.quiz_questions;
create trigger trg_lock_quiz_questions
  before insert or update on public.quiz_questions
  for each row execute function public.prevent_locked_quiz_mutation();

drop trigger if exists trg_lock_quiz_answer_keys on public.quiz_answer_keys;
create trigger trg_lock_quiz_answer_keys
  before insert or update on public.quiz_answer_keys
  for each row execute function public.prevent_locked_quiz_mutation();

-- ---------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can use them)
-- ---------------------------------------------------------------------

create or replace function public.has_subject_access(p_subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.library_entries where subject_id = p_subject and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_subject(p_subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.library_entries
    where subject_id = p_subject and user_id = auth.uid() and role in ('owner', 'editor')
  );
$$;

create or replace function public.is_subject_owner(p_subject uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.subjects where id = p_subject and owner_id = auth.uid()
  );
$$;

create or replace function public.shares_subject(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.library_entries a
    join public.library_entries b on a.subject_id = b.subject_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

-- Thin aliases
create or replace function public.is_room_member(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_subject_access(p_room);
$$;

create or replace function public.is_room_owner(p_room uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_subject_owner(p_room);
$$;

create or replace function public.shares_room(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.shares_subject(p_user);
$$;

create or replace function public.gen_subject_key()
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
    exit when not exists (select 1 from public.subjects where share_key = candidate);
  end loop;
  return candidate;
end $$;

create or replace function public.gen_room_key()
returns text language sql volatile set search_path = public as $$
  select public.gen_subject_key();
$$;

-- ---------------------------------------------------------------------
-- Subject & Sharing RPCs
-- ---------------------------------------------------------------------

create or replace function public.create_subject(p_name text, p_description text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_subject uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and username is not null) then
    raise exception 'Pick a username first.';
  end if;
  insert into public.subjects (name, description, owner_id, share_key)
  values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''), auth.uid(), public.gen_subject_key())
  returning id into v_subject;
  insert into public.library_entries (subject_id, user_id, role) values (v_subject, auth.uid(), 'owner');
  return v_subject;
end $$;

create or replace function public.add_shared_subject(p_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_subject uuid;
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

  select id into v_subject from public.subjects
  where share_enabled = true
    and regexp_replace(share_key, '[^A-Z0-9]', '', 'g') = v_clean;

  if v_subject is null then
    insert into public.join_failures (user_id) values (auth.uid());
    return null;
  end if;

  insert into public.library_entries (subject_id, user_id, role)
  values (v_subject, auth.uid(), 'viewer')
  on conflict (subject_id, user_id) do nothing;
  return v_subject;
end $$;

create or replace function public.preview_subject_by_key(p_key text)
returns table (
  id uuid,
  name text,
  description text,
  share_enabled boolean,
  member_count bigint,
  owner_username text
) language plpgsql stable security definer set search_path = public as $$
declare
  v_clean text := regexp_replace(upper(coalesce(p_key, '')), '[^A-Z0-9]', '', 'g');
  v_sub public.subjects%rowtype;
begin
  select * into v_sub
  from public.subjects
  where regexp_replace(share_key, '[^A-Z0-9]', '', 'g') = v_clean;

  if v_sub.id is null then
    return;
  end if;

  -- If invites are paused, do NOT reveal name, description or member count
  if not v_sub.share_enabled then
    return query
    select
      v_sub.id,
      null::text as name,
      null::text as description,
      false as share_enabled,
      null::bigint as member_count,
      null::text as owner_username;
    return;
  end if;

  return query
  select
    v_sub.id,
    v_sub.name,
    v_sub.description,
    v_sub.share_enabled,
    (select count(*) from public.library_entries where subject_id = v_sub.id),
    (select username from public.profiles where id = v_sub.owner_id);
end $$;

create or replace function public.regenerate_subject_share_key(p_subject uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_key text;
begin
  if not public.is_subject_owner(p_subject) then raise exception 'Only the subject owner can do this.'; end if;
  v_key := public.gen_subject_key();
  update public.subjects set share_key = v_key, updated_at = now() where id = p_subject;
  return v_key;
end $$;

create or replace function public.get_subject_share_key(p_subject uuid)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.is_subject_owner(p_subject) or public.can_edit_subject(p_subject)) then
    raise exception 'Only the subject owner and editors can see the key.';
  end if;
  return (select share_key from public.subjects where id = p_subject);
end $$;

create or replace function public.update_subject(p_subject uuid, p_name text, p_description text, p_cover text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_subject_owner(p_subject) then raise exception 'Only the subject owner can do this.'; end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Give the subject a name.'; end if;
  update public.subjects
  set name = trim(p_name),
      description = nullif(trim(coalesce(p_description, '')), ''),
      cover = coalesce(nullif(trim(coalesce(p_cover, '')), ''), cover),
      updated_at = now()
  where id = p_subject;
end $$;

create or replace function public.set_subject_sharing(
  p_subject uuid,
  p_share_enabled boolean,
  p_allow_fork boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_subject_owner(p_subject) then raise exception 'Only the subject owner can change sharing settings.'; end if;
  update public.subjects
  set share_enabled = coalesce(p_share_enabled, share_enabled),
      allow_fork = coalesce(p_allow_fork, allow_fork),
      updated_at = now()
  where id = p_subject;
end $$;

create or replace function public.set_member_role(
  p_subject uuid,
  p_user uuid,
  p_role text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_subject_owner(p_subject) then raise exception 'Only the subject owner can change member roles.'; end if;
  if p_user = auth.uid() then raise exception 'Use ownership transfer to change your own owner role.'; end if;
  if p_role not in ('editor', 'viewer') then raise exception 'Role must be editor or viewer.'; end if;
  update public.library_entries
  set role = p_role
  where subject_id = p_subject and user_id = p_user and role <> 'owner';
  if not found then raise exception 'Member not found in this subject.'; end if;
end $$;

create or replace function public.transfer_subject_ownership(
  p_subject uuid,
  p_new_owner uuid
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_subject_owner(p_subject) then
    raise exception 'Only the current owner can transfer ownership.';
  end if;
  if p_new_owner is null or p_new_owner = auth.uid() then
    raise exception 'Choose another member to receive ownership.';
  end if;
  if not exists (
    select 1 from public.library_entries
    where subject_id = p_subject and user_id = p_new_owner
  ) then
    raise exception 'The new owner must already have this subject in their library.';
  end if;

  update public.library_entries
  set role = 'editor'
  where subject_id = p_subject and user_id = auth.uid();

  update public.library_entries
  set role = 'owner'
  where subject_id = p_subject and user_id = p_new_owner;

  update public.subjects
  set owner_id = p_new_owner,
      updated_at = now()
  where id = p_subject;
end $$;

create or replace function public.remove_library_entry(p_subject uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user = auth.uid() then
    if public.is_subject_owner(p_subject) then
      raise exception 'Owners can''t leave their own subject. Transfer ownership or delete the subject instead.';
    end if;
  elsif not public.is_subject_owner(p_subject) then
    raise exception 'Only the subject owner can remove members.';
  end if;
  delete from public.library_entries where subject_id = p_subject and user_id = p_user and role <> 'owner';
end $$;

create or replace function public.set_my_subject_cover(p_subject uuid, p_cover text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_cover is not null and p_cover !~ '^[a-z0-9-]{1,24}$' then raise exception 'Unknown design.'; end if;
  update public.library_entries set cover = p_cover
  where subject_id = p_subject and user_id = auth.uid();
  if not found then raise exception 'This subject is not in your library.'; end if;
end $$;

create or replace function public.set_subject_pinned(p_subject uuid, p_pinned boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.library_entries
  set pinned = coalesce(p_pinned, false)
  where subject_id = p_subject and user_id = auth.uid();
  if not found then raise exception 'This subject is not in your library.'; end if;
end $$;

-- ---------------------------------------------------------------------
-- Leaderboards & Reset Polls
-- ---------------------------------------------------------------------

create or replace function public.quiz_leaderboard(p_quiz uuid)
returns table (user_id uuid, username text, score numeric, max_score numeric, submitted_at timestamptz, rank bigint)
language sql stable security definer set search_path = public as $$
  select a.user_id, p.username, a.score, a.max_score, a.submitted_at,
         rank() over (order by a.score desc, a.submitted_at asc) as rank
  from public.attempts a
  join public.quizzes q on q.id = a.quiz_id
  join public.subjects s on s.id = q.subject_id
  join public.profiles p on p.id = a.user_id
  where a.quiz_id = p_quiz
    and a.counts and a.status = 'graded'
    and a.epoch = s.leaderboard_epoch
    and public.has_subject_access(q.subject_id)
  order by rank, p.username;
$$;

create or replace function public.subject_leaderboard(p_subject uuid)
returns table (user_id uuid, username text, total_points numeric, quizzes_taken bigint, avg_percent numeric, rank bigint)
language sql stable security definer set search_path = public as $$
  with s_epoch as (select leaderboard_epoch from public.subjects where id = p_subject),
  scores as (
    select a.user_id,
           sum(a.score) as total_points,
           count(*) as quizzes_taken,
           round(avg(case when a.max_score > 0 then a.score / a.max_score * 100 end), 1) as avg_percent
    from public.attempts a, s_epoch
    where a.subject_id = p_subject and a.counts and a.status = 'graded' and a.epoch = s_epoch.leaderboard_epoch
    group by a.user_id
  )
  select m.user_id, p.username,
         coalesce(scores.total_points, 0), coalesce(scores.quizzes_taken, 0), scores.avg_percent,
         rank() over (order by coalesce(scores.total_points, 0) desc, coalesce(scores.quizzes_taken, 0) desc)
  from public.library_entries m
  join public.profiles p on p.id = m.user_id
  left join scores on scores.user_id = m.user_id
  where m.subject_id = p_subject and public.has_subject_access(p_subject)
  order by 6, p.username;
$$;

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
  select count(*) into v_members from public.library_entries where subject_id = v_poll.subject_id;
  select count(*) into v_yes from public.reset_votes v
    join public.library_entries m on m.user_id = v.user_id and m.subject_id = v_poll.subject_id
    where v.poll_id = p_poll and v.approve;
  if v_yes * 2 > v_members then
    update public.reset_polls set status = 'passed' where id = p_poll;
    update public.subjects set leaderboard_epoch = leaderboard_epoch + 1, updated_at = now() where id = v_poll.subject_id;
    return 'passed';
  end if;
  return 'open';
end $$;

create or replace function public.start_reset_poll(p_room uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_poll uuid; v_open uuid;
begin
  if not public.is_subject_owner(p_room) then raise exception 'Only the subject owner can start a reset vote.'; end if;
  select id into v_open from public.reset_polls where subject_id = p_room and status = 'open';
  if v_open is not null then
    if public.check_reset_poll(v_open) = 'open' then
      raise exception 'A reset vote is already running.';
    end if;
  end if;
  insert into public.reset_polls (subject_id, started_by) values (p_room, auth.uid()) returning id into v_poll;
  insert into public.reset_votes (poll_id, user_id, approve) values (v_poll, auth.uid(), true);
  perform public.check_reset_poll(v_poll);
  return v_poll;
end $$;

create or replace function public.cast_reset_vote(p_poll uuid, p_approve boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v_subject uuid; v_status text;
begin
  select subject_id into v_subject from public.reset_polls where id = p_poll;
  if v_subject is null or not public.has_subject_access(v_subject) then raise exception 'Vote not found.'; end if;
  v_status := public.check_reset_poll(p_poll);
  if v_status <> 'open' then return v_status; end if;
  insert into public.reset_votes (poll_id, user_id, approve) values (p_poll, auth.uid(), p_approve)
  on conflict (poll_id, user_id) do update set approve = excluded.approve, voted_at = now();
  return public.check_reset_poll(p_poll);
end $$;

create or replace function public.cancel_reset_poll(p_poll uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_subject uuid;
begin
  select subject_id into v_subject from public.reset_polls where id = p_poll;
  if not public.is_subject_owner(v_subject) then raise exception 'Only the subject owner can cancel the vote.'; end if;
  update public.reset_polls set status = 'cancelled' where id = p_poll and status = 'open';
end $$;

-- ---------------------------------------------------------------------
-- "New" badges & Section Tracking
-- ---------------------------------------------------------------------

create or replace function public.mark_subject_seen(p_subject uuid, p_section text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_sec text := case when p_section = 'members' then 'sharing' else p_section end;
begin
  if not public.has_subject_access(p_subject) then return; end if;
  insert into public.subject_seen (user_id, subject_id, section, seen_at)
  values (auth.uid(), p_subject, v_sec, now())
  on conflict (user_id, subject_id, section) do update set seen_at = excluded.seen_at;

  update public.library_entries
  set last_opened_at = now()
  where subject_id = p_subject and user_id = auth.uid();
end $$;

create or replace function public.subject_updates(p_subject uuid)
returns table (section text, count bigint)
language sql stable security definer set search_path = public as $$
  with me as (
    select m.added_at from public.library_entries m
    where m.subject_id = p_subject and m.user_id = auth.uid()
  ),
  base as (
    select s.section,
           coalesce(seen.seen_at, legacy_seen.seen_at, me.added_at) as since
    from me
    cross join (values ('materials'), ('flashcards'), ('quizzes'), ('leaderboard'), ('sharing')) as s(section)
    left join public.subject_seen seen
      on seen.user_id = auth.uid() and seen.subject_id = p_subject and seen.section = s.section
    left join public.subject_seen legacy_seen
      on s.section = 'sharing' and legacy_seen.user_id = auth.uid() and legacy_seen.subject_id = p_subject and legacy_seen.section = 'members'
  )
  select 'materials', count(*) from public.materials x, base b
    where b.section = 'materials' and x.subject_id = p_subject and x.uploaded_by <> auth.uid() and x.created_at > b.since
  union all
  select 'flashcards', count(*) from public.decks x, base b
    where b.section = 'flashcards' and x.subject_id = p_subject and x.created_by <> auth.uid() and x.created_at > b.since
  union all
  select 'quizzes', count(*) from public.quizzes x, base b
    where b.section = 'quizzes' and x.subject_id = p_subject and x.created_by <> auth.uid() and x.created_at > b.since
  union all
  select 'leaderboard', count(*) from public.attempts x, base b
    where b.section = 'leaderboard' and x.subject_id = p_subject and x.user_id <> auth.uid()
      and x.counts and x.status = 'graded' and x.submitted_at > b.since
  union all
  select 'sharing', count(*) from public.library_entries x, base b
    where b.section = 'sharing' and x.subject_id = p_subject and x.user_id <> auth.uid() and x.added_at > b.since
  union all
  select 'members', count(*) from public.library_entries x, base b
    where b.section = 'sharing' and x.subject_id = p_subject and x.user_id <> auth.uid() and x.added_at > b.since;
$$;

create or replace function public.subjects_with_updates()
returns table (subject_id uuid, total bigint)
language sql stable security definer set search_path = public as $$
  select m.subject_id,
         (select coalesce(sum(u.count), 0)
          from public.subject_updates(m.subject_id) u
          where u.section <> 'members')::bigint
  from public.library_entries m
  where m.user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- Thin RPC Aliases for Backwards Compatibility
-- ---------------------------------------------------------------------

create or replace function public.create_room(p_name text, p_description text default null)
returns uuid language sql security definer set search_path = public as $$
  select public.create_subject(p_name, p_description);
$$;

create or replace function public.join_room(p_key text)
returns uuid language sql security definer set search_path = public as $$
  select public.add_shared_subject(p_key);
$$;

create or replace function public.regenerate_room_key(p_room uuid)
returns text language sql security definer set search_path = public as $$
  select public.regenerate_subject_share_key(p_room);
$$;

create or replace function public.get_room_key(p_room uuid)
returns text language sql stable security definer set search_path = public as $$
  select public.get_subject_share_key(p_room);
$$;

create or replace function public.update_room(p_room uuid, p_name text, p_description text, p_cover text default null)
returns void language sql security definer set search_path = public as $$
  select public.update_subject(p_room, p_name, p_description, p_cover);
$$;

create or replace function public.remove_member(p_room uuid, p_user uuid)
returns void language sql security definer set search_path = public as $$
  select public.remove_library_entry(p_room, p_user);
$$;

create or replace function public.room_leaderboard(p_room uuid)
returns table (user_id uuid, username text, total_points numeric, quizzes_taken bigint, avg_percent numeric, rank bigint)
language sql stable security definer set search_path = public as $$
  select * from public.subject_leaderboard(p_room);
$$;

create or replace function public.mark_seen(p_room uuid, p_section text)
returns void language sql security definer set search_path = public as $$
  select public.mark_subject_seen(p_room, p_section);
$$;

create or replace function public.room_updates(p_room uuid)
returns table (section text, count bigint)
language sql stable security definer set search_path = public as $$
  select * from public.subject_updates(p_room);
$$;

create or replace function public.rooms_with_updates()
returns table (room_id uuid, total bigint)
language sql stable security definer set search_path = public as $$
  select subject_id as room_id, total from public.subjects_with_updates();
$$;

create or replace function public.set_my_cover(p_room uuid, p_cover text)
returns void language sql security definer set search_path = public as $$
  select public.set_my_subject_cover(p_room, p_cover);
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.library_entries enable row level security;
alter table public.materials enable row level security;
alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.reset_polls enable row level security;
alter table public.reset_votes enable row level security;
alter table public.subject_seen enable row level security;
alter table public.activity_days enable row level security;
alter table public.study_activity_events enable row level security;
alter table public.calendar_events enable row level security;
alter table public.usage_events enable row level security;
alter table public.join_failures enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_subject(id));

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "subjects read" on public.subjects;
create policy "subjects read" on public.subjects for select to authenticated
  using (public.has_subject_access(id));

drop policy if exists "library_entries read" on public.library_entries;
create policy "library_entries read" on public.library_entries for select to authenticated
  using (public.has_subject_access(subject_id));

drop policy if exists "materials read" on public.materials;
create policy "materials read" on public.materials for select to authenticated
  using (public.has_subject_access(subject_id));

drop policy if exists "materials insert" on public.materials;
create policy "materials insert" on public.materials for insert to authenticated
  with check (
    public.can_edit_subject(subject_id)
    and uploaded_by = auth.uid()
    and (
      (source_type = 'pdf' and status = 'uploaded' and content is null and file_path like subject_id::text || '/%')
      or (source_type in ('text', 'wikipedia', 'youtube'))
    )
  );

drop policy if exists "materials update" on public.materials;
create policy "materials update" on public.materials for update to authenticated
  using (public.can_edit_subject(subject_id))
  with check (public.can_edit_subject(subject_id));

drop policy if exists "materials delete" on public.materials;
create policy "materials delete" on public.materials for delete to authenticated
  using (
    (uploaded_by = auth.uid() and public.can_edit_subject(subject_id))
    or public.is_subject_owner(subject_id)
  );

drop policy if exists "decks read" on public.decks;
create policy "decks read" on public.decks for select to authenticated
  using (public.has_subject_access(subject_id));

drop policy if exists "decks insert" on public.decks;
create policy "decks insert" on public.decks for insert to authenticated
  with check (public.can_edit_subject(subject_id) and created_by = auth.uid());

drop policy if exists "decks update" on public.decks;
create policy "decks update" on public.decks for update to authenticated
  using (public.can_edit_subject(subject_id))
  with check (public.can_edit_subject(subject_id));

drop policy if exists "decks delete" on public.decks;
create policy "decks delete" on public.decks for delete to authenticated
  using (
    (created_by = auth.uid() and public.can_edit_subject(subject_id))
    or public.is_subject_owner(subject_id)
  );

drop policy if exists "cards read" on public.cards;
create policy "cards read" on public.cards for select to authenticated
  using (exists (select 1 from public.decks d where d.id = deck_id and public.has_subject_access(d.subject_id)));

drop policy if exists "cards insert" on public.cards;
create policy "cards insert" on public.cards for insert to authenticated
  with check (exists (select 1 from public.decks d where d.id = deck_id and public.can_edit_subject(d.subject_id)));

drop policy if exists "cards update" on public.cards;
create policy "cards update" on public.cards for update to authenticated
  using (exists (select 1 from public.decks d where d.id = deck_id and public.can_edit_subject(d.subject_id)))
  with check (exists (select 1 from public.decks d where d.id = deck_id and public.can_edit_subject(d.subject_id)));

drop policy if exists "cards delete" on public.cards;
create policy "cards delete" on public.cards for delete to authenticated
  using (exists (select 1 from public.decks d where d.id = deck_id and public.can_edit_subject(d.subject_id)));

drop policy if exists "quizzes read" on public.quizzes;
create policy "quizzes read" on public.quizzes for select to authenticated
  using (public.has_subject_access(subject_id));

drop policy if exists "quizzes insert" on public.quizzes;
create policy "quizzes insert" on public.quizzes for insert to authenticated
  with check (public.can_edit_subject(subject_id) and created_by = auth.uid());

drop policy if exists "quizzes update" on public.quizzes;
create policy "quizzes update" on public.quizzes for update to authenticated
  using (public.can_edit_subject(subject_id))
  with check (public.can_edit_subject(subject_id));

drop policy if exists "quizzes delete" on public.quizzes;
create policy "quizzes delete" on public.quizzes for delete to authenticated
  using (
    (created_by = auth.uid() and public.can_edit_subject(subject_id))
    or public.is_subject_owner(subject_id)
  );

drop policy if exists "questions read" on public.quiz_questions;
create policy "questions read" on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and public.has_subject_access(q.subject_id)));

drop policy if exists "questions insert" on public.quiz_questions;
create policy "questions insert" on public.quiz_questions for insert to authenticated
  with check (exists (select 1 from public.quizzes q where q.id = quiz_id and public.can_edit_subject(q.subject_id)));

drop policy if exists "questions update" on public.quiz_questions;
create policy "questions update" on public.quiz_questions for update to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and public.can_edit_subject(q.subject_id)))
  with check (exists (select 1 from public.quizzes q where q.id = quiz_id and public.can_edit_subject(q.subject_id)));

drop policy if exists "questions delete" on public.quiz_questions;
create policy "questions delete" on public.quiz_questions for delete to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and public.can_edit_subject(q.subject_id)));

drop policy if exists "attempts read own" on public.attempts;
create policy "attempts read own" on public.attempts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "answers read own" on public.attempt_answers;
create policy "answers read own" on public.attempt_answers for select to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));

drop policy if exists "polls read" on public.reset_polls;
create policy "polls read" on public.reset_polls for select to authenticated
  using (public.has_subject_access(subject_id));

drop policy if exists "votes read" on public.reset_votes;
create policy "votes read" on public.reset_votes for select to authenticated
  using (exists (select 1 from public.reset_polls p where p.id = poll_id and public.has_subject_access(p.subject_id)));

drop policy if exists "seen read own" on public.subject_seen;
create policy "seen read own" on public.subject_seen for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "activity_days read own" on public.activity_days;
create policy "activity_days read own" on public.activity_days for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "study_activity_events read own" on public.study_activity_events;
create policy "study_activity_events read own" on public.study_activity_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "calendar_events read own" on public.calendar_events;
create policy "calendar_events read own" on public.calendar_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "calendar_events insert own" on public.calendar_events;
create policy "calendar_events insert own" on public.calendar_events for insert to authenticated
  with check (
    user_id = auth.uid()
    and (subject_id is null or public.has_subject_access(subject_id))
  );

create or replace function public.check_user_calendar_event_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.calendar_events
  where user_id = new.user_id;

  if v_count >= 500 then
    raise exception 'Maximum limit of 500 calendar events reached per user.';
  end if;
  return new;
end $$;

drop trigger if exists trg_calendar_events_limit on public.calendar_events;
create trigger trg_calendar_events_limit
  before insert on public.calendar_events
  for each row execute function public.check_user_calendar_event_limit();

drop policy if exists "calendar_events update own" on public.calendar_events;
create policy "calendar_events update own" on public.calendar_events for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (subject_id is null or public.has_subject_access(subject_id))
  );

drop policy if exists "calendar_events delete own" on public.calendar_events;
create policy "calendar_events delete own" on public.calendar_events for delete to authenticated
  using (user_id = auth.uid());

revoke select on public.subjects from anon, authenticated;
grant select (
  id,
  name,
  description,
  owner_id,
  share_enabled,
  allow_fork,
  forked_from_id,
  forked_from_name,
  forked_from_owner_id,
  leaderboard_epoch,
  cover,
  created_at,
  updated_at
) on public.subjects to authenticated;

revoke all on all functions in schema public from public, anon;

grant execute on function public.user_local_date(uuid, timestamptz) to authenticated;
grant execute on function public.set_my_timezone(text) to authenticated;
grant execute on function public.set_my_username(text) to authenticated;
grant execute on function public.record_deck_card_reviews(uuid, uuid[]) to authenticated;
grant execute on function public.quiz_has_counting_attempt(uuid) to authenticated;
grant execute on function public.has_subject_access(uuid) to authenticated;
grant execute on function public.can_edit_subject(uuid) to authenticated;
grant execute on function public.is_subject_owner(uuid) to authenticated;
grant execute on function public.shares_subject(uuid) to authenticated;
grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_owner(uuid) to authenticated;
grant execute on function public.shares_room(uuid) to authenticated;
grant execute on function public.create_subject(text, text) to authenticated;
grant execute on function public.add_shared_subject(text) to authenticated;
grant execute on function public.preview_subject_by_key(text) to authenticated, anon;
grant execute on function public.regenerate_subject_share_key(uuid) to authenticated;
grant execute on function public.get_subject_share_key(uuid) to authenticated;
grant execute on function public.update_subject(uuid, text, text, text) to authenticated;
grant execute on function public.set_subject_sharing(uuid, boolean, boolean) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.transfer_subject_ownership(uuid, uuid) to authenticated;
grant execute on function public.remove_library_entry(uuid, uuid) to authenticated;
grant execute on function public.set_my_subject_cover(uuid, text) to authenticated;
grant execute on function public.set_subject_pinned(uuid, boolean) to authenticated;
grant execute on function public.quiz_leaderboard(uuid) to authenticated;
grant execute on function public.subject_leaderboard(uuid) to authenticated;
grant execute on function public.start_reset_poll(uuid) to authenticated;
grant execute on function public.cast_reset_vote(uuid, boolean) to authenticated;
grant execute on function public.cancel_reset_poll(uuid) to authenticated;
grant execute on function public.mark_subject_seen(uuid, text) to authenticated;
grant execute on function public.subject_updates(uuid) to authenticated;
grant execute on function public.subjects_with_updates() to authenticated;
grant execute on function public.create_room(text, text) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.regenerate_room_key(uuid) to authenticated;
grant execute on function public.get_room_key(uuid) to authenticated;
grant execute on function public.update_room(uuid, text, text, text) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.room_leaderboard(uuid) to authenticated;
grant execute on function public.mark_seen(uuid, text) to authenticated;
grant execute on function public.room_updates(uuid) to authenticated;
grant execute on function public.rooms_with_updates() to authenticated;
grant execute on function public.set_my_cover(uuid, text) to authenticated;

revoke execute on function public.gen_subject_key() from public, anon, authenticated;
revoke execute on function public.gen_room_key() from public, anon, authenticated;
revoke execute on function public.check_reset_poll(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.recompute_user_streak(uuid) from public, anon, authenticated;
revoke execute on function public.record_study_activity(uuid, text, int, numeric, uuid) from public, anon, authenticated;
revoke execute on function public.prevent_locked_quiz_mutation() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Storage: private "materials" bucket for PDFs (50 MB max on free plan)
-- Files are stored as  <subject_id>/<random>.pdf
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('materials', 'materials', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

drop policy if exists "materials upload" on storage.objects;
create policy "materials upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materials'
    and public.can_edit_subject(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "materials download" on storage.objects;
create policy "materials download" on storage.objects for select to authenticated
  using (
    bucket_id = 'materials'
    and public.has_subject_access(((storage.foldername(name))[1])::uuid)
  );
