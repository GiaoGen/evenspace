-- Core account identities, host-led rooms, membership, and RLS boundaries.
create schema if not exists security;

revoke all on schema security from public, anon;
grant usage on schema security to authenticated, service_role;

alter default privileges in schema security
  revoke all on functions from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key
    references auth.users (id) on delete cascade,
  display_name text not null,
  theme text not null default 'system',
  deleted_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_valid
    check (
      display_name = btrim(display_name)
      and char_length(display_name) between 1 and 60
    ),
  constraint profiles_theme_valid
    check (theme in ('system', 'light', 'dark')),
  constraint profiles_anonymized_after_delete
    check (anonymized_at is null or deleted_at is not null)
);

create table public.actors (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid
    references auth.users (id) on delete restrict,
  kind text not null,
  claimed_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actors_kind_valid
    check (kind in ('guest', 'account', 'deleted')),
  constraint actors_owner_matches_kind
    check (
      (
        kind in ('guest', 'account')
        and owner_user_id is not null
        and anonymized_at is null
      )
      or (
        kind = 'deleted'
        and owner_user_id is null
        and anonymized_at is not null
      )
    )
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  public_id text not null default (
    'room_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
  ),
  name text not null,
  description text not null default '',
  mode text not null default 'host-led',
  status text not null default 'active',
  time_zone text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  end_reason text,
  ended_by_actor_id uuid
    references public.actors (id) on delete restrict,
  archive_started_at timestamptz,
  archived_at timestamptz,
  purge_after timestamptz,
  member_limit smallint not null,
  requires_approval boolean not null default true,
  member_list_visibility text not null default 'members',
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_public_id_unique unique (public_id),
  constraint rooms_public_id_valid
    check (public_id ~ '^room_[a-z0-9_]{3,40}$'),
  constraint rooms_name_valid
    check (
      name = btrim(name)
      and char_length(name) between 1 and 80
    ),
  constraint rooms_description_valid
    check (char_length(description) <= 500),
  constraint rooms_mode_host_led_only
    check (mode = 'host-led'),
  constraint rooms_status_valid
    check (
      status in (
        'active',
        'freezing',
        'archiving',
        'archived',
        'purge_pending',
        'purged'
      )
    ),
  constraint rooms_time_zone_valid
    check (
      time_zone = btrim(time_zone)
      and char_length(time_zone) between 1 and 64
    ),
  constraint rooms_duration_valid
    check (
      ends_at >= starts_at + interval '15 minutes'
      and ends_at <= starts_at + interval '24 hours'
    ),
  constraint rooms_end_reason_valid
    check (end_reason is null or char_length(end_reason) <= 120),
  constraint rooms_member_limit_valid
    check (member_limit between 2 and 10),
  constraint rooms_member_list_visibility_valid
    check (member_list_visibility in ('members', 'host')),
  constraint rooms_revision_positive
    check (revision > 0),
  constraint rooms_archive_order_valid
    check (
      archived_at is null
      or archive_started_at is null
      or archived_at >= archive_started_at
    ),
  constraint rooms_purge_order_valid
    check (
      purge_after is null
      or archived_at is null
      or purge_after >= archived_at
    )
);

create table public.room_members (
  room_id uuid not null
    references public.rooms (id) on delete cascade,
  actor_id uuid not null
    references public.actors (id) on delete restrict,
  nickname text not null,
  role text not null,
  state text not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  removed_at timestamptz,
  archive_eligible boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (room_id, actor_id),
  constraint room_members_nickname_valid
    check (
      nickname = btrim(nickname)
      and char_length(nickname) between 1 and 60
    ),
  constraint room_members_role_valid
    check (role in ('host', 'member')),
  constraint room_members_state_valid
    check (state in ('active', 'muted', 'removed', 'banned')),
  constraint room_members_host_state_valid
    check (role <> 'host' or state in ('active', 'muted')),
  constraint room_members_removed_at_matches_state
    check (
      (
        state in ('active', 'muted')
        and removed_at is null
      )
      or (
        state in ('removed', 'banned')
        and removed_at is not null
      )
    )
);

create index actors_owner_user_id_idx
  on public.actors (owner_user_id)
  where owner_user_id is not null;

create index rooms_status_ends_at_idx
  on public.rooms (status, ends_at);

create index room_members_actor_id_state_room_id_idx
  on public.room_members (actor_id, state, room_id);

create unique index room_members_one_host_per_room_idx
  on public.room_members (room_id)
  where role = 'host';

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at()
  from public, anon, authenticated, service_role;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger actors_set_updated_at
before update on public.actors
for each row execute function private.set_updated_at();

create trigger rooms_set_updated_at
before update on public.rooms
for each row execute function private.set_updated_at();

create trigger room_members_set_updated_at
before update on public.room_members
for each row execute function private.set_updated_at();

create function security.can_read_room(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.room_members as membership
      join public.actors as actor
        on actor.id = membership.actor_id
      join public.rooms as room
        on room.id = membership.room_id
      where membership.room_id = target_room_id
        and actor.owner_user_id = (select auth.uid())
        and actor.kind <> 'deleted'
        and membership.state in ('active', 'muted')
        and (
          room.status in ('active', 'freezing', 'archiving')
          or (
            room.status in ('archived', 'purge_pending')
            and membership.archive_eligible
            and coalesce(
              (select (auth.jwt() ->> 'is_anonymous')::boolean),
              true
            ) = false
          )
        )
    );
$$;

create function security.is_room_host(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.room_members as membership
      join public.actors as actor
        on actor.id = membership.actor_id
      join public.rooms as room
        on room.id = membership.room_id
      where membership.room_id = target_room_id
        and actor.owner_user_id = (select auth.uid())
        and actor.kind <> 'deleted'
        and membership.role = 'host'
        and membership.state in ('active', 'muted')
        and (
          room.status in ('active', 'freezing', 'archiving')
          or (
            room.status in ('archived', 'purge_pending')
            and membership.archive_eligible
            and coalesce(
              (select (auth.jwt() ->> 'is_anonymous')::boolean),
              true
            ) = false
          )
        )
    );
$$;

create function security.can_read_room_members(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.room_members as membership
      join public.actors as actor
        on actor.id = membership.actor_id
      join public.rooms as room
        on room.id = membership.room_id
      where membership.room_id = target_room_id
        and actor.owner_user_id = (select auth.uid())
        and actor.kind <> 'deleted'
        and membership.state in ('active', 'muted')
        and room.member_list_visibility = 'members'
        and (
          room.status in ('active', 'freezing', 'archiving')
          or (
            room.status in ('archived', 'purge_pending')
            and membership.archive_eligible
            and coalesce(
              (select (auth.jwt() ->> 'is_anonymous')::boolean),
              true
            ) = false
          )
        )
    );
$$;

revoke all on function security.can_read_room(uuid)
  from public, anon, service_role;
revoke all on function security.is_room_host(uuid)
  from public, anon, service_role;
revoke all on function security.can_read_room_members(uuid)
  from public, anon, service_role;

grant execute on function security.can_read_room(uuid)
  to authenticated;
grant execute on function security.is_room_host(uuid)
  to authenticated;
grant execute on function security.can_read_room_members(uuid)
  to authenticated;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.actors enable row level security;
alter table public.actors force row level security;
alter table public.rooms enable row level security;
alter table public.rooms force row level security;
alter table public.room_members enable row level security;
alter table public.room_members force row level security;

revoke all on table public.profiles
  from public, anon, authenticated;
revoke all on table public.actors
  from public, anon, authenticated;
revoke all on table public.rooms
  from public, anon, authenticated;
revoke all on table public.room_members
  from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant insert (user_id, display_name, theme)
  on table public.profiles to authenticated;
grant update (display_name, theme)
  on table public.profiles to authenticated;

grant select on table public.actors to authenticated;
grant select on table public.rooms to authenticated;
grant select on table public.room_members to authenticated;

grant all privileges on table public.profiles to service_role;
grant all privileges on table public.actors to service_role;
grant all privileges on table public.rooms to service_role;
grant all privileges on table public.room_members to service_role;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy actors_select_owned
on public.actors
for select
to authenticated
using ((select auth.uid()) = owner_user_id);

create policy rooms_select_member
on public.rooms
for select
to authenticated
using ((select security.can_read_room(id)));

create policy room_members_select_visible
on public.room_members
for select
to authenticated
using (
  (select security.is_room_host(room_id))
  or (
    state in ('active', 'muted')
    and (select security.can_read_room_members(room_id))
  )
);

comment on schema security is
  'Non-Data-API schema for narrowly scoped EventSpace RLS helpers.';

comment on table public.profiles is
  'Private account preferences keyed by the Supabase Auth user.';

comment on table public.actors is
  'Stable content identities whose Auth account ownership can be claimed.';

comment on table public.rooms is
  'Authoritative host-led EventSpace room lifecycle state.';

comment on table public.room_members is
  'Room-scoped actor identity, host/member role, and access state.';

insert into private.schema_versions (component, version)
values ('core_identity_rooms', 1)
on conflict (component) do update
set
  version = excluded.version,
  applied_at = now();
