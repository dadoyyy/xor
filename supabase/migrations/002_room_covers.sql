-- xor migration 002: room cover designs
-- Run once in Supabase → SQL Editor → New query → Run.
-- Safe to run again.

alter table public.rooms
  add column if not exists cover text;

alter table public.rooms
  drop constraint if exists rooms_cover_format;
alter table public.rooms
  add constraint rooms_cover_format check (cover is null or cover ~ '^[a-z0-9-]{1,24}$');

-- members can read the cover (the secret key column stays hidden)
grant select (cover) on public.rooms to authenticated;

-- update_room now also saves the cover (optional 4th argument)
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
