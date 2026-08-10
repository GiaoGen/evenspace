alter table public.room_members
  add column is_favorite boolean not null default false,
  add column hidden_at timestamptz;

comment on column public.room_members.is_favorite is
  'Current member preference used by the private Rooms collection.';
comment on column public.room_members.hidden_at is
  'When set, hides the room from this member Rooms collection without changing membership or room access.';

drop function public.list_current_user_rooms(integer, timestamptz, uuid);
drop function public.get_current_user_room(text);
drop function security.list_current_user_rooms(integer, timestamptz, uuid);
drop function security.get_current_user_room(text);

create function security.list_current_user_rooms(
  requested_limit integer default 20,
  requested_cursor_updated_at timestamptz default null,
  requested_cursor_id uuid default null
)
returns table (
  room_id uuid,
  public_id text,
  name text,
  description text,
  mode text,
  status text,
  time_zone text,
  starts_at timestamptz,
  ends_at timestamptz,
  archived_at timestamptz,
  member_limit smallint,
  requires_approval boolean,
  member_list_visibility text,
  revision bigint,
  updated_at timestamptz,
  viewer_actor_id uuid,
  viewer_nickname text,
  viewer_role text,
  viewer_state text,
  viewer_archive_eligible boolean,
  viewer_is_favorite boolean,
  member_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  caller_is_anonymous boolean := coalesce(
    (select (auth.jwt() ->> 'is_anonymous')::boolean),
    true
  );
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if requested_limit is null or requested_limit not between 1 and 50 then
    raise exception using
      errcode = '22023',
      message = 'invalid_page_limit';
  end if;

  if (requested_cursor_updated_at is null)
    <> (requested_cursor_id is null)
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_cursor';
  end if;

  return query
  select
    room.id,
    room.public_id,
    room.name,
    room.description,
    room.mode,
    room.status,
    room.time_zone,
    room.starts_at,
    room.ends_at,
    room.archived_at,
    room.member_limit,
    room.requires_approval,
    room.member_list_visibility,
    room.revision,
    room.updated_at,
    actor.id,
    viewer_membership.nickname,
    viewer_membership.role,
    viewer_membership.state,
    viewer_membership.archive_eligible,
    viewer_membership.is_favorite,
    (
      select count(*)
      from public.room_members as counted_membership
      where counted_membership.room_id = room.id
        and counted_membership.state in ('active', 'muted')
    )
  from public.actors as actor
  join public.room_members as viewer_membership
    on viewer_membership.actor_id = actor.id
  join public.rooms as room
    on room.id = viewer_membership.room_id
  where actor.owner_user_id = caller_user_id
    and actor.is_primary
    and actor.kind <> 'deleted'
    and viewer_membership.state in ('active', 'muted')
    and viewer_membership.hidden_at is null
    and (
      room.status in ('active', 'freezing', 'archiving')
      or (
        room.status in ('archived', 'purge_pending')
        and viewer_membership.archive_eligible
        and not caller_is_anonymous
      )
    )
    and (
      requested_cursor_updated_at is null
      or (room.updated_at, room.id)
        < (requested_cursor_updated_at, requested_cursor_id)
    )
  order by room.updated_at desc, room.id desc
  limit requested_limit;
end;
$$;

create function security.get_current_user_room(
  requested_public_id text
)
returns table (
  room_id uuid,
  public_id text,
  name text,
  description text,
  mode text,
  status text,
  time_zone text,
  starts_at timestamptz,
  ends_at timestamptz,
  archived_at timestamptz,
  member_limit smallint,
  requires_approval boolean,
  member_list_visibility text,
  revision bigint,
  updated_at timestamptz,
  viewer_actor_id uuid,
  viewer_nickname text,
  viewer_role text,
  viewer_state text,
  viewer_archive_eligible boolean,
  viewer_is_favorite boolean,
  member_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  caller_is_anonymous boolean := coalesce(
    (select (auth.jwt() ->> 'is_anonymous')::boolean),
    true
  );
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if requested_public_id is null
    or requested_public_id !~ '^room_[a-z0-9_]{3,40}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_public_id';
  end if;

  return query
  select
    room.id,
    room.public_id,
    room.name,
    room.description,
    room.mode,
    room.status,
    room.time_zone,
    room.starts_at,
    room.ends_at,
    room.archived_at,
    room.member_limit,
    room.requires_approval,
    room.member_list_visibility,
    room.revision,
    room.updated_at,
    actor.id,
    viewer_membership.nickname,
    viewer_membership.role,
    viewer_membership.state,
    viewer_membership.archive_eligible,
    viewer_membership.is_favorite,
    (
      select count(*)
      from public.room_members as counted_membership
      where counted_membership.room_id = room.id
        and counted_membership.state in ('active', 'muted')
    )
  from public.actors as actor
  join public.room_members as viewer_membership
    on viewer_membership.actor_id = actor.id
  join public.rooms as room
    on room.id = viewer_membership.room_id
  where actor.owner_user_id = caller_user_id
    and actor.is_primary
    and actor.kind <> 'deleted'
    and viewer_membership.state in ('active', 'muted')
    and room.public_id = requested_public_id
    and (
      room.status in ('active', 'freezing', 'archiving')
      or (
        room.status in ('archived', 'purge_pending')
        and viewer_membership.archive_eligible
        and not caller_is_anonymous
      )
    );
end;
$$;

create function security.set_current_user_room_favorite(
  requested_public_id text,
  requested_is_favorite boolean
)
returns table (room_id uuid, is_favorite boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if requested_public_id is null
    or requested_public_id !~ '^room_[a-z0-9_]{3,40}$'
    or requested_is_favorite is null
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_preference';
  end if;

  return query
  update public.room_members as membership
  set is_favorite = requested_is_favorite
  from public.actors as actor, public.rooms as room
  where membership.actor_id = actor.id
    and membership.room_id = room.id
    and actor.owner_user_id = caller_user_id
    and actor.is_primary
    and actor.kind <> 'deleted'
    and membership.state in ('active', 'muted')
    and room.public_id = requested_public_id
    and (select security.can_read_room(room.id))
  returning membership.room_id, membership.is_favorite;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'room_preference_unavailable';
  end if;
end;
$$;

create function security.set_current_user_room_hidden(
  requested_public_id text,
  requested_hidden boolean
)
returns table (room_id uuid, hidden_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if requested_public_id is null
    or requested_public_id !~ '^room_[a-z0-9_]{3,40}$'
    or requested_hidden is null
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_preference';
  end if;

  return query
  update public.room_members as membership
  set
    hidden_at = case when requested_hidden then statement_timestamp() else null end,
    is_favorite = case when requested_hidden then false else membership.is_favorite end
  from public.actors as actor, public.rooms as room
  where membership.actor_id = actor.id
    and membership.room_id = room.id
    and actor.owner_user_id = caller_user_id
    and actor.is_primary
    and actor.kind <> 'deleted'
    and membership.state in ('active', 'muted')
    and room.public_id = requested_public_id
    and (select security.can_read_room(room.id))
  returning membership.room_id, membership.hidden_at;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'room_preference_unavailable';
  end if;
end;
$$;

create function public.list_current_user_rooms(
  requested_limit integer default 20,
  requested_cursor_updated_at timestamptz default null,
  requested_cursor_id uuid default null
)
returns table (
  room_id uuid,
  public_id text,
  name text,
  description text,
  mode text,
  status text,
  time_zone text,
  starts_at timestamptz,
  ends_at timestamptz,
  archived_at timestamptz,
  member_limit smallint,
  requires_approval boolean,
  member_list_visibility text,
  revision bigint,
  updated_at timestamptz,
  viewer_actor_id uuid,
  viewer_nickname text,
  viewer_role text,
  viewer_state text,
  viewer_archive_eligible boolean,
  viewer_is_favorite boolean,
  member_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from security.list_current_user_rooms(
    requested_limit,
    requested_cursor_updated_at,
    requested_cursor_id
  );
$$;

create function public.get_current_user_room(
  requested_public_id text
)
returns table (
  room_id uuid,
  public_id text,
  name text,
  description text,
  mode text,
  status text,
  time_zone text,
  starts_at timestamptz,
  ends_at timestamptz,
  archived_at timestamptz,
  member_limit smallint,
  requires_approval boolean,
  member_list_visibility text,
  revision bigint,
  updated_at timestamptz,
  viewer_actor_id uuid,
  viewer_nickname text,
  viewer_role text,
  viewer_state text,
  viewer_archive_eligible boolean,
  viewer_is_favorite boolean,
  member_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from security.get_current_user_room(requested_public_id);
$$;

create function public.set_current_user_room_favorite(
  requested_public_id text,
  requested_is_favorite boolean
)
returns table (room_id uuid, is_favorite boolean)
language sql
security invoker
set search_path = ''
as $$
  select * from security.set_current_user_room_favorite(
    requested_public_id,
    requested_is_favorite
  );
$$;

create function public.set_current_user_room_hidden(
  requested_public_id text,
  requested_hidden boolean
)
returns table (room_id uuid, hidden_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  select * from security.set_current_user_room_hidden(
    requested_public_id,
    requested_hidden
  );
$$;

revoke all on function security.list_current_user_rooms(integer, timestamptz, uuid)
  from public, anon, service_role;
revoke all on function security.get_current_user_room(text)
  from public, anon, service_role;
revoke all on function security.set_current_user_room_favorite(text, boolean)
  from public, anon, service_role;
revoke all on function security.set_current_user_room_hidden(text, boolean)
  from public, anon, service_role;

grant execute on function security.list_current_user_rooms(integer, timestamptz, uuid)
  to authenticated;
grant execute on function security.get_current_user_room(text)
  to authenticated;
grant execute on function security.set_current_user_room_favorite(text, boolean)
  to authenticated;
grant execute on function security.set_current_user_room_hidden(text, boolean)
  to authenticated;

revoke all on function public.list_current_user_rooms(integer, timestamptz, uuid)
  from public, anon, service_role;
revoke all on function public.get_current_user_room(text)
  from public, anon, service_role;
revoke all on function public.set_current_user_room_favorite(text, boolean)
  from public, anon, service_role;
revoke all on function public.set_current_user_room_hidden(text, boolean)
  from public, anon, service_role;

grant execute on function public.list_current_user_rooms(integer, timestamptz, uuid)
  to authenticated;
grant execute on function public.get_current_user_room(text)
  to authenticated;
grant execute on function public.set_current_user_room_favorite(text, boolean)
  to authenticated;
grant execute on function public.set_current_user_room_hidden(text, boolean)
  to authenticated;

comment on function public.list_current_user_rooms(integer, timestamptz, uuid) is
  'Returns one keyset-paginated page of visible rooms and current-member preferences.';
comment on function public.get_current_user_room(text) is
  'Returns one readable room and current viewer membership even when hidden from the Rooms list.';
comment on function public.set_current_user_room_favorite(text, boolean) is
  'Updates only the current primary actor room favorite preference.';
comment on function public.set_current_user_room_hidden(text, boolean) is
  'Updates only the current primary actor Rooms-list visibility preference.';

insert into private.schema_versions (component, version)
values ('room_member_preferences', 1)
on conflict (component) do update
set version = excluded.version, applied_at = now();

notify pgrst, 'reload schema';
