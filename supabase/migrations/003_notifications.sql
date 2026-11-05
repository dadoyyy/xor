-- xor migration 003: "new" badges (what's new since you last opened each section)
-- Run once in Supabase → SQL Editor → New query → Run. Safe to run again.

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
