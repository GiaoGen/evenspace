create table private.room_invites (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references public.rooms (id) on delete cascade,
  revision integer not null,
  token_hash bytea not null,
  code_hash bytea not null,
  status text not null default 'active',
  created_by_actor_id uuid not null
    references public.actors (id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint room_invites_revision_positive check (revision > 0),
  constraint room_invites_status_valid
    check (status in ('active', 'revoked')),
  constraint room_invites_revoked_at_matches_status
    check (
      (status = 'active' and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null)
    ),
  constraint room_invites_room_revision_unique
    unique (room_id, revision)
);

create unique index room_invites_one_active_per_room_idx
  on private.room_invites (room_id)
  where status = 'active';

create unique index room_invites_active_token_hash_idx
  on private.room_invites (token_hash)
  where status = 'active';

create unique index room_invites_active_code_hash_idx
  on private.room_invites (code_hash)
  where status = 'active';

create index room_invites_created_by_actor_id_idx
  on private.room_invites (created_by_actor_id);

create table private.room_join_requests (
  id uuid not null default gen_random_uuid(),
  room_id uuid not null
    references public.rooms (id) on delete cascade,
  actor_id uuid not null
    references public.actors (id) on delete restrict,
  invite_id uuid not null
    references private.room_invites (id) on delete restrict,
  nickname text not null,
  note text not null default '',
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (room_id, actor_id),
  constraint room_join_requests_id_unique unique (id),
  constraint room_join_requests_nickname_valid
    check (
      nickname = btrim(nickname)
      and char_length(nickname) between 1 and 60
    ),
  constraint room_join_requests_note_valid
    check (char_length(note) <= 240),
  constraint room_join_requests_status_valid
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  constraint room_join_requests_decision_matches_status
    check (
      (status = 'pending' and decided_at is null)
      or (status <> 'pending' and decided_at is not null)
    )
);

create index room_join_requests_actor_id_idx
  on private.room_join_requests (actor_id);

create index room_join_requests_invite_id_idx
  on private.room_join_requests (invite_id);

create unique index room_members_active_nickname_unique_idx
  on public.room_members (room_id, lower(nickname))
  where state in ('active', 'muted');

alter table private.room_invites enable row level security;
alter table private.room_invites force row level security;
alter table private.room_join_requests enable row level security;
alter table private.room_join_requests force row level security;

revoke all on table private.room_invites
  from public, anon, authenticated, service_role;
revoke all on table private.room_join_requests
  from public, anon, authenticated, service_role;

create policy room_invites_deny_all
on private.room_invites
as restrictive
for all
to public
using (false)
with check (false);

create policy room_join_requests_deny_all
on private.room_join_requests
as restrictive
for all
to public
using (false)
with check (false);

create function security.create_room_invite(
  requested_room_public_id text,
  requested_token text,
  requested_code text
)
returns table (
  room_id uuid,
  public_id text,
  invite_revision integer
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
  caller_actor_id uuid;
  selected_room_id uuid;
  existing_revision integer;
  next_revision integer;
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

  if requested_room_public_id is null
    or requested_room_public_id !~ '^room_[a-z0-9_]{3,40}$'
    or requested_token is null
    or requested_token !~ '^[A-Za-z0-9_-]{43}$'
    or requested_code is null
    or requested_code !~ '^[A-Z0-9]{8}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_invite_input';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'eventspace:room_invite:' || requested_room_public_id,
      0
    )
  );

  select room.id, actor.id
  into selected_room_id, caller_actor_id
  from public.rooms as room
  join public.room_members as membership
    on membership.room_id = room.id
  join public.actors as actor
    on actor.id = membership.actor_id
  where room.public_id = requested_room_public_id
    and room.status = 'active'
    and room.ends_at > command_now
    and actor.owner_user_id = caller_user_id
    and actor.is_primary
    and actor.kind = 'account'
    and membership.role = 'host'
    and membership.state in ('active', 'muted')
  for update of room;

  if selected_room_id is null or caller_actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'host_permission_required';
  end if;

  select invite.revision
  into existing_revision
  from private.room_invites as invite
  where invite.room_id = selected_room_id
    and invite.status = 'active'
    and invite.token_hash = extensions.digest(
      pg_catalog.convert_to(requested_token, 'UTF8'),
      'sha256'
    )
    and invite.code_hash = extensions.digest(
      pg_catalog.convert_to(requested_code, 'UTF8'),
      'sha256'
    );

  if existing_revision is not null then
    return query
    select selected_room_id, requested_room_public_id, existing_revision;
    return;
  end if;

  select coalesce(max(invite.revision), 0) + 1
  into next_revision
  from private.room_invites as invite
  where invite.room_id = selected_room_id;

  update private.room_invites as invite
  set
    status = 'revoked',
    revoked_at = command_now
  where invite.room_id = selected_room_id
    and invite.status = 'active';

  insert into private.room_invites (
    room_id,
    revision,
    token_hash,
    code_hash,
    created_by_actor_id,
    created_at
  )
  values (
    selected_room_id,
    next_revision,
    extensions.digest(
      pg_catalog.convert_to(requested_token, 'UTF8'),
      'sha256'
    ),
    extensions.digest(
      pg_catalog.convert_to(requested_code, 'UTF8'),
      'sha256'
    ),
    caller_actor_id,
    command_now
  );

  return query
  select selected_room_id, requested_room_public_id, next_revision;
end;
$$;

create function security.resolve_room_invite_code(
  requested_code text
)
returns table (
  room_id uuid,
  public_id text,
  name text,
  description text,
  ends_at timestamptz,
  time_zone text,
  requires_approval boolean,
  member_limit smallint,
  member_count bigint,
  invite_revision integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if requested_code is null
    or requested_code !~ '^[A-Z0-9]{8}$'
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_invite_input';
  end if;

  return query
  select
    room.id,
    room.public_id,
    room.name,
    room.description,
    room.ends_at,
    room.time_zone,
    room.requires_approval,
    room.member_limit,
    (
      select count(*)
      from public.room_members as membership
      where membership.room_id = room.id
        and membership.state in ('active', 'muted')
    ),
    invite.revision
  from private.room_invites as invite
  join public.rooms as room
    on room.id = invite.room_id
  where room.status = 'active'
    and room.ends_at > statement_timestamp()
    and invite.status = 'active'
    and invite.code_hash = extensions.digest(
      pg_catalog.convert_to(requested_code, 'UTF8'),
      'sha256'
    );
end;
$$;

create function security.preview_room_invite(
  requested_room_public_id text,
  requested_token text default null,
  requested_code text default null
)
returns table (
  room_id uuid,
  public_id text,
  name text,
  description text,
  ends_at timestamptz,
  time_zone text,
  requires_approval boolean,
  member_limit smallint,
  member_count bigint,
  invite_revision integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if requested_room_public_id is null
    or requested_room_public_id !~ '^room_[a-z0-9_]{3,40}$'
    or (
      (requested_token is null and requested_code is null)
      or (requested_token is not null and requested_code is not null)
    )
    or (
      requested_token is not null
      and requested_token !~ '^[A-Za-z0-9_-]{43}$'
    )
    or (
      requested_code is not null
      and requested_code !~ '^[A-Z0-9]{8}$'
    )
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_invite_input';
  end if;

  return query
  select
    room.id,
    room.public_id,
    room.name,
    room.description,
    room.ends_at,
    room.time_zone,
    room.requires_approval,
    room.member_limit,
    (
      select count(*)
      from public.room_members as membership
      where membership.room_id = room.id
        and membership.state in ('active', 'muted')
    ),
    invite.revision
  from private.room_invites as invite
  join public.rooms as room
    on room.id = invite.room_id
  where room.public_id = requested_room_public_id
    and room.status = 'active'
    and room.ends_at > statement_timestamp()
    and invite.status = 'active'
    and (
      (
        requested_token is not null
        and invite.token_hash = extensions.digest(
          pg_catalog.convert_to(requested_token, 'UTF8'),
          'sha256'
        )
      )
      or (
        requested_code is not null
        and invite.code_hash = extensions.digest(
          pg_catalog.convert_to(requested_code, 'UTF8'),
          'sha256'
        )
      )
    );
end;
$$;

create function security.join_room_with_invite(
  requested_room_public_id text,
  requested_nickname text,
  requested_note text default '',
  requested_token text default null,
  requested_code text default null
)
returns table (
  outcome text,
  room_id uuid,
  public_id text,
  actor_id uuid,
  request_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  normalized_nickname text := btrim(requested_nickname);
  normalized_note text := btrim(requested_note);
  caller_actor_id uuid;
  selected_room_id uuid;
  selected_invite_id uuid;
  approval_required boolean;
  room_capacity integer;
  current_members integer;
  existing_state text;
  selected_request_id uuid;
  command_now timestamptz := statement_timestamp();
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication_required';
  end if;

  if requested_room_public_id is null
    or requested_room_public_id !~ '^room_[a-z0-9_]{3,40}$'
    or (
      (requested_token is null and requested_code is null)
      or (requested_token is not null and requested_code is not null)
    )
    or (
      requested_token is not null
      and requested_token !~ '^[A-Za-z0-9_-]{43}$'
    )
    or (
      requested_code is not null
      and requested_code !~ '^[A-Z0-9]{8}$'
    )
    or normalized_nickname is null
    or char_length(normalized_nickname) not between 1 and 60
    or normalized_note is null
    or char_length(normalized_note) > 240
  then
    raise exception using
      errcode = '22023',
      message = 'invalid_join_input';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'eventspace:join_room:'
      || requested_room_public_id
      || ':'
      || caller_user_id::text,
      0
    )
  );

  select actor.id
  into caller_actor_id
  from public.actors as actor
  where actor.owner_user_id = caller_user_id
    and actor.is_primary
    and actor.kind in ('guest', 'account')
  order by actor.created_at, actor.id
  limit 1
  for update of actor;

  if caller_actor_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'identity_bootstrap_required';
  end if;

  select
    room.id,
    invite.id,
    room.requires_approval,
    room.member_limit
  into
    selected_room_id,
    selected_invite_id,
    approval_required,
    room_capacity
  from private.room_invites as invite
  join public.rooms as room
    on room.id = invite.room_id
  where room.public_id = requested_room_public_id
    and room.status = 'active'
    and room.ends_at > command_now
    and invite.status = 'active'
    and (
      (
        requested_token is not null
        and invite.token_hash = extensions.digest(
          pg_catalog.convert_to(requested_token, 'UTF8'),
          'sha256'
        )
      )
      or (
        requested_code is not null
        and invite.code_hash = extensions.digest(
          pg_catalog.convert_to(requested_code, 'UTF8'),
          'sha256'
        )
      )
    )
  for update of room;

  if selected_room_id is null or selected_invite_id is null then
    raise exception using
      errcode = '22023',
      message = 'invalid_or_expired_invite';
  end if;

  select membership.state
  into existing_state
  from public.room_members as membership
  where membership.room_id = selected_room_id
    and membership.actor_id = caller_actor_id;

  if existing_state = 'banned' then
    raise exception using
      errcode = '42501',
      message = 'room_access_denied';
  end if;

  if existing_state in ('active', 'muted') then
    return query
    select
      'joined'::text,
      selected_room_id,
      requested_room_public_id,
      caller_actor_id,
      null::uuid;
    return;
  end if;

  select count(*)
  into current_members
  from public.room_members as membership
  where membership.room_id = selected_room_id
    and membership.state in ('active', 'muted');

  if current_members >= room_capacity then
    raise exception using
      errcode = '23514',
      message = 'room_capacity_reached';
  end if;

  if approval_required then
    insert into private.room_join_requests (
      room_id,
      actor_id,
      invite_id,
      nickname,
      note,
      status,
      requested_at,
      decided_at
    )
    values (
      selected_room_id,
      caller_actor_id,
      selected_invite_id,
      normalized_nickname,
      normalized_note,
      'pending',
      command_now,
      null
    )
    on conflict on constraint room_join_requests_pkey do update
    set
      invite_id = excluded.invite_id,
      nickname = excluded.nickname,
      note = excluded.note,
      status = 'pending',
      requested_at = excluded.requested_at,
      decided_at = null
    returning private.room_join_requests.id
    into selected_request_id;

    return query
    select
      'pending'::text,
      selected_room_id,
      requested_room_public_id,
      caller_actor_id,
      selected_request_id;
    return;
  end if;

  if exists (
    select 1
    from public.room_members as membership
    where membership.room_id = selected_room_id
      and membership.state in ('active', 'muted')
      and lower(membership.nickname) = lower(normalized_nickname)
      and membership.actor_id <> caller_actor_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'nickname_unavailable';
  end if;

  insert into public.room_members (
    room_id,
    actor_id,
    nickname,
    role,
    state,
    joined_at,
    left_at,
    removed_at,
    archive_eligible
  )
  values (
    selected_room_id,
    caller_actor_id,
    normalized_nickname,
    'member',
    'active',
    command_now,
    null,
    null,
    false
  )
  on conflict on constraint room_members_pkey do update
  set
    nickname = excluded.nickname,
    role = 'member',
    state = 'active',
    joined_at = excluded.joined_at,
    left_at = null,
    removed_at = null
  where public.room_members.state = 'removed';

  return query
  select
    'joined'::text,
    selected_room_id,
    requested_room_public_id,
    caller_actor_id,
    null::uuid;
end;
$$;

create function public.create_room_invite(
  requested_room_public_id text,
  requested_token text,
  requested_code text
)
returns table (
  room_id uuid,
  public_id text,
  invite_revision integer
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.create_room_invite(
    requested_room_public_id,
    requested_token,
    requested_code
  );
$$;

create function public.preview_room_invite(
  requested_room_public_id text,
  requested_token text default null,
  requested_code text default null
)
returns table (
  room_id uuid,
  public_id text,
  name text,
  description text,
  ends_at timestamptz,
  time_zone text,
  requires_approval boolean,
  member_limit smallint,
  member_count bigint,
  invite_revision integer
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.preview_room_invite(
    requested_room_public_id,
    requested_token,
    requested_code
  );
$$;

create function public.join_room_with_invite(
  requested_room_public_id text,
  requested_nickname text,
  requested_note text default '',
  requested_token text default null,
  requested_code text default null
)
returns table (
  outcome text,
  room_id uuid,
  public_id text,
  actor_id uuid,
  request_id uuid
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.join_room_with_invite(
    requested_room_public_id,
    requested_nickname,
    requested_note,
    requested_token,
    requested_code
  );
$$;

create function public.resolve_room_invite_code(
  requested_code text
)
returns table (
  room_id uuid,
  public_id text,
  name text,
  description text,
  ends_at timestamptz,
  time_zone text,
  requires_approval boolean,
  member_limit smallint,
  member_count bigint,
  invite_revision integer
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.resolve_room_invite_code(requested_code);
$$;

grant usage on schema security to anon;

revoke all on function security.create_room_invite(text, text, text)
  from public, anon, service_role;
revoke all on function security.preview_room_invite(text, text, text)
  from public, service_role;
revoke all on function security.join_room_with_invite(
  text,
  text,
  text,
  text,
  text
) from public, anon, service_role;
revoke all on function security.resolve_room_invite_code(text)
  from public, service_role;

grant execute on function security.create_room_invite(text, text, text)
  to authenticated;
grant execute on function security.preview_room_invite(text, text, text)
  to anon, authenticated;
grant execute on function security.join_room_with_invite(
  text,
  text,
  text,
  text,
  text
) to authenticated;
grant execute on function security.resolve_room_invite_code(text)
  to anon, authenticated;

revoke all on function public.create_room_invite(text, text, text)
  from public, anon, service_role;
revoke all on function public.preview_room_invite(text, text, text)
  from public, service_role;
revoke all on function public.join_room_with_invite(
  text,
  text,
  text,
  text,
  text
) from public, anon, service_role;
revoke all on function public.resolve_room_invite_code(text)
  from public, service_role;

grant execute on function public.create_room_invite(text, text, text)
  to authenticated;
grant execute on function public.preview_room_invite(text, text, text)
  to anon, authenticated;
grant execute on function public.join_room_with_invite(
  text,
  text,
  text,
  text,
  text
) to authenticated;
grant execute on function public.resolve_room_invite_code(text)
  to anon, authenticated;

comment on table private.room_invites is
  'Hashed room link tokens and short invite codes; raw secrets are never stored.';
comment on table private.room_join_requests is
  'Pending or decided Host approval requests keyed by room and stable actor.';
comment on function public.preview_room_invite(text, text, text) is
  'Returns minimal active room metadata only after an invite secret matches.';
comment on function public.resolve_room_invite_code(text) is
  'Resolves an active globally unique short code to minimal room metadata.';

insert into private.schema_versions (component, version)
values ('room_invites_and_join', 1)
on conflict (component) do update
set
  version = excluded.version,
  applied_at = now();
