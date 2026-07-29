begin;

set local statement_timeout = '20s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(7);

insert into auth.users (id, email)
values (
  '1a000000-0000-4000-8000-000000000001',
  'avatar24@example.invalid'
);

insert into public.profiles (
  user_id,
  display_name,
  avatar_variant
)
values (
  '1a000000-0000-4000-8000-000000000001',
  'Avatar owner',
  'initials'
);

insert into public.actors (
  id,
  owner_user_id,
  kind,
  is_primary,
  claimed_at
)
values (
  '2a000000-0000-4000-8000-000000000001',
  '1a000000-0000-4000-8000-000000000001',
  'account',
  true,
  now()
);

insert into public.assets (
  id,
  owner_actor_id,
  kind,
  status,
  object_key,
  mime_type,
  byte_size,
  ready_at
)
values
  (
    '7a000000-0000-4000-8000-000000000001',
    '2a000000-0000-4000-8000-000000000001',
    'image',
    'ready',
    'avatars/avatar24/old',
    'image/png',
    1024,
    now()
  ),
  (
    '7a000000-0000-4000-8000-000000000002',
    '2a000000-0000-4000-8000-000000000001',
    'image',
    'ready',
    'avatars/avatar24/new',
    'image/png',
    1024,
    now()
  ),
  (
    '7a000000-0000-4000-8000-000000000003',
    '2a000000-0000-4000-8000-000000000001',
    'image',
    'ready',
    'avatars/avatar24/custom',
    'image/png',
    1024,
    now()
  );

update public.profiles
set avatar_asset_id = '7a000000-0000-4000-8000-000000000001'
where user_id = '1a000000-0000-4000-8000-000000000001';

insert into public.rooms (
  id,
  public_id,
  name,
  time_zone,
  starts_at,
  ends_at,
  member_limit
)
values
  (
    '3a000000-0000-4000-8000-000000000001',
    'room_avatar_sync_024a',
    'Following room',
    'UTC',
    now(),
    now() + interval '2 hours',
    6
  ),
  (
    '3a000000-0000-4000-8000-000000000002',
    'room_avatar_sync_024b',
    'Custom room',
    'UTC',
    now(),
    now() + interval '2 hours',
    6
  ),
  (
    '3a000000-0000-4000-8000-000000000003',
    'room_avatar_sync_024c',
    'New room',
    'UTC',
    now(),
    now() + interval '2 hours',
    6
  );

insert into public.room_members (
  room_id,
  actor_id,
  nickname,
  role
)
values
  (
    '3a000000-0000-4000-8000-000000000001',
    '2a000000-0000-4000-8000-000000000001',
    'Avatar owner',
    'host'
  ),
  (
    '3a000000-0000-4000-8000-000000000002',
    '2a000000-0000-4000-8000-000000000001',
    'Room identity',
    'member'
  );

update public.room_members
set avatar_asset_id = '7a000000-0000-4000-8000-000000000003'
where room_id = '3a000000-0000-4000-8000-000000000002';

select extensions.results_eq(
  $$select avatar_asset_id
    from public.room_members
    where room_id = '3a000000-0000-4000-8000-000000000001'$$,
  array['7a000000-0000-4000-8000-000000000001'::uuid],
  'existing default membership starts with the profile avatar'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"1a000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select asset_id
    from public.finalize_profile_avatar_upload(
      '7a000000-0000-4000-8000-000000000002'
    )$$,
  array['7a000000-0000-4000-8000-000000000002'::uuid],
  'a ready profile avatar can be finalized'
);

reset role;

select extensions.results_eq(
  $$select avatar_asset_id
    from public.profiles
    where user_id = '1a000000-0000-4000-8000-000000000001'$$,
  array['7a000000-0000-4000-8000-000000000002'::uuid],
  'profile points at the new avatar'
);
select extensions.results_eq(
  $$select avatar_asset_id
    from public.room_members
    where room_id = '3a000000-0000-4000-8000-000000000001'$$,
  array['7a000000-0000-4000-8000-000000000002'::uuid],
  'membership following the profile receives the new avatar'
);
select extensions.results_eq(
  $$select avatar_asset_id
    from public.room_members
    where room_id = '3a000000-0000-4000-8000-000000000002'$$,
  array['7a000000-0000-4000-8000-000000000003'::uuid],
  'a custom room avatar is preserved'
);

insert into public.room_members (
  room_id,
  actor_id,
  nickname,
  role
)
values (
  '3a000000-0000-4000-8000-000000000003',
  '2a000000-0000-4000-8000-000000000001',
  'Avatar owner',
  'host'
);

select extensions.results_eq(
  $$select avatar_asset_id
    from public.room_members
    where room_id = '3a000000-0000-4000-8000-000000000003'$$,
  array['7a000000-0000-4000-8000-000000000002'::uuid],
  'new Host membership inherits the current profile avatar'
);
select extensions.results_eq(
  $$select version
    from private.schema_versions
    where component = 'profile_avatar_room_sync'$$,
  array[1],
  'profile avatar room sync schema version is recorded'
);

select * from extensions.finish();
rollback;
