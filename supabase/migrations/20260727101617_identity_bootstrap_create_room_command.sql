alter table public.actors
add column is_primary boolean not null default true;

alter table public.actors
add constraint actors_primary_owner_valid
check (not is_primary or owner_user_id is not null);

create unique index actors_one_primary_per_owner_idx
  on public.actors (owner_user_id)
  where
    owner_user_id is not null
    and is_primary
    and kind <> 'deleted';

create table private.command_receipts (
  actor_id uuid not null
    references public.actors (id) on delete restrict,
  command_name text not null,
  idempotency_key uuid not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, command_name, idempotency_key),
  constraint command_receipts_command_name_valid
    check (
      command_name = btrim(command_name)
      and char_length(command_name) between 1 and 80
    ),
  constraint command_receipts_result_object
    check (jsonb_typeof(result) = 'object')
);

alter table private.command_receipts enable row level security;
alter table private.command_receipts force row level security;

revoke all on table private.command_receipts
  from public, anon, authenticated, service_role;

create function security.bootstrap_identity(
  requested_display_name text,
  requested_theme text default 'system'
)
returns table (
  profile_user_id uuid,
  actor_id uuid,
  actor_kind text,
  display_name text,
  theme text,
  is_anonymous boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  caller_is_anonymous boolean := coalesce(
    (select (auth.jwt() ->> 'is_anonymous')::boolean),
    true
  );
  normalized_display_name text := btrim(requested_display_name);
  normalized_theme text := btrim(requested_theme);
  selected_actor_id uuid;
  selected_actor_kind text;
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if normalized_display_name is null
    or char_length(normalized_display_name) not between 1 and 60
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_display_name';
  end if;

  if normalized_theme is null
    or normalized_theme not in ('system', 'light', 'dark')
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_theme';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'eventspace:bootstrap_identity:' || caller_user_id::text,
      0
    )
  );

  insert into public.profiles (
    user_id,
    display_name,
    theme
  )
  values (
    caller_user_id,
    normalized_display_name,
    normalized_theme
  )
  on conflict (user_id) do nothing;

  select actor.id, actor.kind
  into selected_actor_id, selected_actor_kind
  from public.actors as actor
  where actor.owner_user_id = caller_user_id
    and actor.is_primary
    and actor.kind <> 'deleted'
  order by actor.created_at, actor.id
  limit 1
  for update;

  if selected_actor_id is null then
    insert into public.actors (
      owner_user_id,
      kind,
      is_primary
    )
    values (
      caller_user_id,
      case
        when caller_is_anonymous then 'guest'
        else 'account'
      end,
      true
    )
    returning id, kind
    into selected_actor_id, selected_actor_kind;
  elsif not caller_is_anonymous and selected_actor_kind = 'guest' then
    update public.actors
    set
      kind = 'account',
      claimed_at = coalesce(claimed_at, now())
    where id = selected_actor_id
    returning kind into selected_actor_kind;
  end if;

  return query
  select
    profile.user_id,
    selected_actor_id,
    selected_actor_kind,
    profile.display_name,
    profile.theme,
    caller_is_anonymous
  from public.profiles as profile
  where profile.user_id = caller_user_id;
end;
$$;

create function security.create_host_led_room(
  requested_name text,
  requested_description text,
  requested_time_zone text,
  requested_duration_minutes integer,
  requested_member_limit integer,
  requested_requires_approval boolean,
  requested_idempotency_key uuid
)
returns table (
  room_id uuid,
  public_id text,
  actor_id uuid,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  caller_is_anonymous boolean := coalesce(
    (select (auth.jwt() ->> 'is_anonymous')::boolean),
    true
  );
  normalized_name text := btrim(requested_name);
  normalized_description text := btrim(requested_description);
  normalized_time_zone text := btrim(requested_time_zone);
  current_actor_id uuid;
  current_display_name text;
  existing_result jsonb;
  new_room_id uuid;
  new_public_id text;
  command_now timestamptz := statement_timestamp();
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if caller_is_anonymous then
    raise exception using
      errcode = '42501',
      message = 'permanent_account_required';
  end if;

  if requested_idempotency_key is null then
    raise exception using
      errcode = '22023',
      message = 'idempotency_key_required';
  end if;

  if normalized_name is null
    or char_length(normalized_name) not between 1 and 80
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_name';
  end if;

  if normalized_description is null
    or char_length(normalized_description) > 500
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_description';
  end if;

  if requested_duration_minutes is null
    or requested_duration_minutes not between 15 and 1440
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_duration';
  end if;

  if requested_member_limit is null
    or requested_member_limit not between 2 and 10
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_member_limit';
  end if;

  if requested_requires_approval is null then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_approval_mode';
  end if;

  if normalized_time_zone is null
    or char_length(normalized_time_zone) not between 1 and 64
    or not exists (
      select 1
      from pg_catalog.pg_timezone_names as zone
      where zone.name = normalized_time_zone
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_room_time_zone';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'eventspace:create_room:'
      || caller_user_id::text
      || ':'
      || requested_idempotency_key::text,
      0
    )
  );

  select actor.id, profile.display_name
  into current_actor_id, current_display_name
  from public.actors as actor
  join public.profiles as profile
    on profile.user_id = actor.owner_user_id
  where actor.owner_user_id = caller_user_id
    and actor.is_primary
    and actor.kind = 'account'
  order by actor.created_at, actor.id
  limit 1
  for update of actor;

  if current_actor_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'identity_bootstrap_required';
  end if;

  select receipt.result
  into existing_result
  from private.command_receipts as receipt
  where receipt.actor_id = current_actor_id
    and receipt.command_name = 'create_room'
    and receipt.idempotency_key = requested_idempotency_key;

  if existing_result is not null then
    return query
    select
      (existing_result ->> 'room_id')::uuid,
      existing_result ->> 'public_id',
      current_actor_id,
      false;
    return;
  end if;

  insert into public.rooms as inserted_room (
    name,
    description,
    mode,
    status,
    time_zone,
    starts_at,
    ends_at,
    member_limit,
    requires_approval,
    member_list_visibility,
    revision
  )
  values (
    normalized_name,
    normalized_description,
    'host-led',
    'active',
    normalized_time_zone,
    command_now,
    command_now
      + pg_catalog.make_interval(mins => requested_duration_minutes),
    requested_member_limit,
    requested_requires_approval,
    'members',
    1
  )
  returning inserted_room.id, inserted_room.public_id
  into new_room_id, new_public_id;

  insert into public.room_members (
    room_id,
    actor_id,
    nickname,
    role,
    state,
    joined_at,
    archive_eligible
  )
  values (
    new_room_id,
    current_actor_id,
    current_display_name,
    'host',
    'active',
    command_now,
    true
  );

  insert into private.command_receipts (
    actor_id,
    command_name,
    idempotency_key,
    result
  )
  values (
    current_actor_id,
    'create_room',
    requested_idempotency_key,
    pg_catalog.jsonb_build_object(
      'room_id',
      new_room_id,
      'public_id',
      new_public_id
    )
  );

  return query
  select
    new_room_id,
    new_public_id,
    current_actor_id,
    true;
end;
$$;

create function public.bootstrap_identity(
  requested_display_name text,
  requested_theme text default 'system'
)
returns table (
  profile_user_id uuid,
  actor_id uuid,
  actor_kind text,
  display_name text,
  theme text,
  is_anonymous boolean
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.bootstrap_identity(
    requested_display_name,
    requested_theme
  );
$$;

create function public.create_host_led_room(
  requested_name text,
  requested_description text,
  requested_time_zone text,
  requested_duration_minutes integer,
  requested_member_limit integer,
  requested_requires_approval boolean,
  requested_idempotency_key uuid
)
returns table (
  room_id uuid,
  public_id text,
  actor_id uuid,
  created boolean
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.create_host_led_room(
    requested_name,
    requested_description,
    requested_time_zone,
    requested_duration_minutes,
    requested_member_limit,
    requested_requires_approval,
    requested_idempotency_key
  );
$$;

revoke all on function security.bootstrap_identity(text, text)
  from public, anon, service_role;
revoke all on function security.create_host_led_room(
  text,
  text,
  text,
  integer,
  integer,
  boolean,
  uuid
) from public, anon, service_role;

grant execute on function security.bootstrap_identity(text, text)
  to authenticated;
grant execute on function security.create_host_led_room(
  text,
  text,
  text,
  integer,
  integer,
  boolean,
  uuid
) to authenticated;

revoke all on function public.bootstrap_identity(text, text)
  from public, anon, service_role;
revoke all on function public.create_host_led_room(
  text,
  text,
  text,
  integer,
  integer,
  boolean,
  uuid
) from public, anon, service_role;

grant execute on function public.bootstrap_identity(text, text)
  to authenticated;
grant execute on function public.create_host_led_room(
  text,
  text,
  text,
  integer,
  integer,
  boolean,
  uuid
) to authenticated;

comment on table private.command_receipts is
  'Idempotent command results keyed by actor, command, and request UUID.';

comment on function public.bootstrap_identity(text, text) is
  'Idempotently creates the current Auth user profile and primary actor.';

comment on function public.create_host_led_room(
  text,
  text,
  text,
  integer,
  integer,
  boolean,
  uuid
) is
  'Creates one host-led room and Host membership exactly once per key.';

insert into private.schema_versions (component, version)
values ('identity_room_commands', 1)
on conflict (component) do update
set
  version = excluded.version,
  applied_at = now();
