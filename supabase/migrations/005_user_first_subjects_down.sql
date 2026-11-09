-- =====================================================================
-- xor migration 005 (DOWN / ROLLBACK): revert user-first to room-first
-- =====================================================================

begin;

-- 1. Drop new policies & triggers
drop trigger if exists trg_lock_quiz_questions on public.quiz_questions;
drop trigger if exists trg_lock_quiz_answer_keys on public.quiz_answer_keys;

drop policy if exists "profiles read" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "subjects read" on public.subjects;
drop policy if exists "library_entries read" on public.library_entries;
drop policy if exists "materials read" on public.materials;
drop policy if exists "materials insert" on public.materials;
drop policy if exists "materials update" on public.materials;
drop policy if exists "materials delete" on public.materials;
drop policy if exists "decks read" on public.decks;
drop policy if exists "decks insert" on public.decks;
drop policy if exists "decks update" on public.decks;
drop policy if exists "decks delete" on public.decks;
drop policy if exists "cards read" on public.cards;
drop policy if exists "cards insert" on public.cards;
drop policy if exists "cards update" on public.cards;
drop policy if exists "cards delete" on public.cards;
drop policy if exists "quizzes read" on public.quizzes;
drop policy if exists "quizzes insert" on public.quizzes;
drop policy if exists "quizzes update" on public.quizzes;
drop policy if exists "quizzes delete" on public.quizzes;
drop policy if exists "questions read" on public.quiz_questions;
drop policy if exists "questions insert" on public.quiz_questions;
drop policy if exists "questions update" on public.quiz_questions;
drop policy if exists "questions delete" on public.quiz_questions;
drop policy if exists "attempts read own" on public.attempts;
drop policy if exists "answers read own" on public.attempt_answers;
drop policy if exists "polls read" on public.reset_polls;
drop policy if exists "votes read" on public.reset_votes;
drop policy if exists "seen read own" on public.subject_seen;
drop policy if exists "activity_days read own" on public.activity_days;
drop policy if exists "study_activity_events read own" on public.study_activity_events;
drop policy if exists "calendar_events read own" on public.calendar_events;
drop policy if exists "calendar_events insert own" on public.calendar_events;
drop policy if exists "calendar_events update own" on public.calendar_events;
drop policy if exists "calendar_events delete own" on public.calendar_events;
drop policy if exists "materials upload" on storage.objects;
drop policy if exists "materials download" on storage.objects;

-- 2. Drop new tables
drop table if exists public.calendar_events cascade;
drop table if exists public.study_activity_events cascade;
drop table if exists public.activity_days cascade;
drop index if exists public.profiles_username_lower;

-- 3. Revert library_entries roles ('editor' / 'viewer' -> 'member') and columns
alter table public.library_entries
  drop constraint if exists library_entries_role_check;

update public.library_entries
set role = 'member'
where role in ('editor', 'viewer');

alter table public.library_entries
  alter column role set default 'member',
  add constraint room_members_role_check check (role in ('owner', 'member')),
  drop constraint if exists library_entries_cover_format,
  add constraint room_members_cover_format check (cover is null or cover ~ '^[a-z0-9-]{1,24}$'),
  drop column if exists pinned,
  drop column if exists last_opened_at;

-- 4. Revert subject_seen section values & constraint
update public.subject_seen
set section = 'members'
where section = 'sharing';

alter table public.subject_seen
  drop constraint if exists subject_seen_section_check,
  add constraint room_seen_section_check check (section in ('materials', 'flashcards', 'quizzes', 'leaderboard', 'members'));

-- 5. Drop added columns on subjects, materials, decks, quizzes, profiles
alter table public.subjects
  drop constraint if exists subjects_cover_format,
  add constraint rooms_cover_format check (cover is null or cover ~ '^[a-z0-9-]{1,24}$'),
  drop column if exists share_enabled,
  drop column if exists allow_fork,
  drop column if exists forked_from_id,
  drop column if exists forked_from_name,
  drop column if exists forked_from_owner_id,
  drop column if exists updated_at;

alter table public.materials
  drop column if exists source_type,
  drop column if exists forked_from_id;

alter table public.decks
  drop column if exists source_type,
  drop column if exists forked_from_id;

alter table public.quizzes
  drop column if exists source_type,
  drop column if exists forked_from_id;

alter table public.profiles
  drop column if exists timezone,
  drop column if exists current_streak,
  drop column if exists longest_streak,
  drop column if exists last_active_date;

-- 6. Rename tables and columns back to room-first names
alter table public.subjects rename column share_key to secret_key;
alter table public.subjects rename to rooms;

alter table public.library_entries rename column subject_id to room_id;
alter table public.library_entries rename column added_at to joined_at;
alter table public.library_entries rename to room_members;

alter table public.subject_seen rename column subject_id to room_id;
alter table public.subject_seen rename to room_seen;

alter table public.materials rename column subject_id to room_id;
alter table public.decks rename column subject_id to room_id;
alter table public.quizzes rename column subject_id to room_id;
alter table public.attempts rename column subject_id to room_id;
alter table public.reset_polls rename column subject_id to room_id;

alter index if exists library_entries_user rename to room_members_user;
alter index if exists materials_subject rename to materials_room;
alter index if exists decks_subject rename to decks_room;
alter index if exists quizzes_subject rename to quizzes_room;
alter index if exists reset_polls_one_open_subject rename to reset_polls_one_open;
drop index if exists attempts_subject_scoring_idx;
drop index if exists library_entries_user_pinned_idx;
drop index if exists library_entries_subject_role_idx;
drop index if exists subjects_owner_idx;
drop index if exists subjects_forked_from_idx;

-- 7. Drop subject-specific functions
drop function if exists public.user_local_date(uuid, timestamptz);
drop function if exists public.recompute_user_streak(uuid);
drop function if exists public.record_study_activity(uuid, text, int, numeric, uuid);
drop function if exists public.record_study_activity(uuid, text, int, numeric);
drop function if exists public.record_deck_card_reviews(uuid, uuid[]);
drop function if exists public.set_my_timezone(text);
drop function if exists public.quiz_has_counting_attempt(uuid);
drop function if exists public.prevent_locked_quiz_mutation();
drop function if exists public.create_subject(text, text);
drop function if exists public.add_shared_subject(text);
drop function if exists public.regenerate_subject_share_key(uuid);
drop function if exists public.get_subject_share_key(uuid);
drop function if exists public.update_subject(uuid, text, text, text);
drop function if exists public.set_subject_sharing(uuid, boolean, boolean);
drop function if exists public.set_member_role(uuid, uuid, text);
drop function if exists public.transfer_subject_ownership(uuid, uuid);
drop function if exists public.remove_library_entry(uuid, uuid);
drop function if exists public.set_my_subject_cover(uuid, text);
drop function if exists public.set_subject_pinned(uuid, boolean);
drop function if exists public.subject_leaderboard(uuid);
drop function if exists public.mark_subject_seen(uuid, text);
drop function if exists public.subject_updates(uuid);
drop function if exists public.subjects_with_updates();
drop function if exists public.gen_subject_key();

-- 8. Restore original room-first helper functions & RPCs
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

drop function if exists public.has_subject_access(uuid);
drop function if exists public.can_edit_subject(uuid);
drop function if exists public.is_subject_owner(uuid);
drop function if exists public.shares_subject(uuid);

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

create or replace function public.get_room_key(p_room uuid)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_room_owner(p_room) then raise exception 'Only the room owner can see the key.'; end if;
  return (select secret_key from public.rooms where id = p_room);
end $$;

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

create or replace function public.mark_seen(p_room uuid, p_section text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_room_member(p_room) then return; end if;
  insert into public.room_seen (user_id, room_id, section, seen_at)
  values (auth.uid(), p_room, p_section, now())
  on conflict (user_id, room_id, section) do update set seen_at = excluded.seen_at;
end $$;

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

create or replace function public.rooms_with_updates()
returns table (room_id uuid, total bigint)
language sql stable security definer set search_path = public as $$
  select m.room_id, (select coalesce(sum(u.count), 0) from public.room_updates(m.room_id) u)::bigint
  from public.room_members m
  where m.user_id = auth.uid();
$$;

create or replace function public.set_my_cover(p_room uuid, p_cover text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_cover is not null and p_cover !~ '^[a-z0-9-]{1,24}$' then raise exception 'Unknown design.'; end if;
  update public.room_members set cover = p_cover
  where room_id = p_room and user_id = auth.uid();
  if not found then raise exception 'You are not in this room.'; end if;
end $$;

-- 9. Restore original RLS policies and column grants
create policy "profiles read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_room(id));
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "rooms read" on public.rooms for select to authenticated
  using (public.is_room_member(id));

create policy "members read" on public.room_members for select to authenticated
  using (public.is_room_member(room_id));

create policy "materials read" on public.materials for select to authenticated
  using (public.is_room_member(room_id));
create policy "materials insert" on public.materials for insert to authenticated
  with check (
    public.is_room_member(room_id) and uploaded_by = auth.uid()
    and status = 'uploaded' and content is null
    and file_path like room_id::text || '/%'
  );

create policy "decks read" on public.decks for select to authenticated
  using (public.is_room_member(room_id));
create policy "decks delete" on public.decks for delete to authenticated
  using (created_by = auth.uid() or public.is_room_owner(room_id));

create policy "cards read" on public.cards for select to authenticated
  using (exists (select 1 from public.decks d where d.id = deck_id and public.is_room_member(d.room_id)));

create policy "quizzes read" on public.quizzes for select to authenticated
  using (public.is_room_member(room_id));
create policy "quizzes delete" on public.quizzes for delete to authenticated
  using (created_by = auth.uid() or public.is_room_owner(room_id));

create policy "questions read" on public.quiz_questions for select to authenticated
  using (exists (select 1 from public.quizzes q where q.id = quiz_id and public.is_room_member(q.room_id)));

create policy "attempts read own" on public.attempts for select to authenticated
  using (user_id = auth.uid());

create policy "answers read own" on public.attempt_answers for select to authenticated
  using (exists (select 1 from public.attempts a where a.id = attempt_id and a.user_id = auth.uid()));

create policy "polls read" on public.reset_polls for select to authenticated
  using (public.is_room_member(room_id));

create policy "votes read" on public.reset_votes for select to authenticated
  using (exists (select 1 from public.reset_polls p where p.id = poll_id and public.is_room_member(p.room_id)));

create policy "seen read own" on public.room_seen for select to authenticated
  using (user_id = auth.uid());

create policy "materials upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materials'
    and public.is_room_member(((storage.foldername(name))[1])::uuid)
  );

create policy "materials download" on storage.objects for select to authenticated
  using (
    bucket_id = 'materials'
    and public.is_room_member(((storage.foldername(name))[1])::uuid)
  );

revoke select on public.rooms from anon, authenticated;
grant select (id, name, description, owner_id, leaderboard_epoch, created_at, cover) on public.rooms to authenticated;

revoke all on all functions in schema public from public, anon;

grant execute on function public.is_room_member(uuid) to authenticated;
grant execute on function public.is_room_owner(uuid) to authenticated;
grant execute on function public.shares_room(uuid) to authenticated;
grant execute on function public.create_room(text, text) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.regenerate_room_key(uuid) to authenticated;
grant execute on function public.get_room_key(uuid) to authenticated;
grant execute on function public.update_room(uuid, text, text, text) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.quiz_leaderboard(uuid) to authenticated;
grant execute on function public.room_leaderboard(uuid) to authenticated;
grant execute on function public.start_reset_poll(uuid) to authenticated;
grant execute on function public.cast_reset_vote(uuid, boolean) to authenticated;
grant execute on function public.cancel_reset_poll(uuid) to authenticated;
grant execute on function public.mark_seen(uuid, text) to authenticated;
grant execute on function public.room_updates(uuid) to authenticated;
grant execute on function public.rooms_with_updates() to authenticated;
grant execute on function public.set_my_cover(uuid, text) to authenticated;

revoke execute on function public.gen_room_key() from public, anon, authenticated;
revoke execute on function public.check_reset_poll(uuid) from public, anon, authenticated;

commit;

