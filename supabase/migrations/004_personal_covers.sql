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
