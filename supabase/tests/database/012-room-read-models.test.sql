begin;

set local statement_timeout = '20s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(24);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.list_current_user_rooms(integer,timestamp with time zone,uuid)',
    'execute'
  ),
  'anon cannot list current-user rooms'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.get_current_user_room(text)',
    'execute'
  ),
  'anon cannot read a current-user room'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.list_current_user_rooms(integer,timestamp with time zone,uuid)',
    'execute'
  ),
  'authenticated can list current-user rooms'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.get_current_user_room(text)',
    'execute'
  ),
  'authenticated can read one current-user room'
);

select extensions.results_eq(
  $$select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'list_current_user_rooms',
        'get_current_user_room'
      )
      and not procedure.prosecdef$$,
  array[2::bigint],
  'public read wrappers are security invoker'
);

select extensions.results_eq(
  $$select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'security'
      and procedure.proname in (
        'list_current_user_rooms',
        'get_current_user_room'
      )
      and procedure.prosecdef
      and procedure.proconfig @> array['search_path=""']::text[]$$,
  array[2::bigint],
  'privileged read implementations have an empty search path'
);

insert into auth.users (id, email)
values
  (
    '12000000-0000-4000-8000-000000000001',
    'be012-host@example.invalid'
  ),
  (
    '12000000-0000-4000-8000-000000000002',
    'be012-member@example.invalid'
  ),
  (
    '12000000-0000-4000-8000-000000000003',
    'be012-outsider@example.invalid'
  );

insert into public.profiles (user_id, display_name)
values
  ('12000000-0000-4000-8000-000000000001', 'Host'),
  ('12000000-0000-4000-8000-000000000002', 'Member'),
  ('12000000-0000-4000-8000-000000000003', 'Outsider');

insert into public.actors (
  id,
  owner_user_id,
  kind,
  is_primary,
  claimed_at
)
values
  (
    '22000000-0000-4000-8000-000000000001',
    '12000000-0000-4000-8000-000000000001',
    'account',
    true,
    '2026-07-27T10:00:00Z'
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    '12000000-0000-4000-8000-000000000002',
    'account',
    true,
    '2026-07-27T10:00:00Z'
  ),
  (
    '22000000-0000-4000-8000-000000000003',
    '12000000-0000-4000-8000-000000000003',
    'account',
    true,
    '2026-07-27T10:00:00Z'
  );

insert into public.rooms (
  id,
  public_id,
  name,
  status,
  time_zone,
  starts_at,
  ends_at,
  archived_at,
  member_limit,
  updated_at
)
values
  (
    '32000000-0000-4000-8000-000000000001',
    'room_be012_active',
    'Active room',
    'active',
    'America/New_York',
    '2026-07-27T10:00:00Z',
    '2026-07-27T12:00:00Z',
    null,
    6,
    '2026-07-27T10:30:00Z'
  ),
  (
    '32000000-0000-4000-8000-000000000002',
    'room_be012_archive',
    'Archived room',
    'archived',
    'UTC',
    '2026-07-26T10:00:00Z',
    '2026-07-26T12:00:00Z',
    '2026-07-26T12:10:00Z',
    4,
    '2026-07-27T09:30:00Z'
  );

insert into public.room_members (
  room_id,
  actor_id,
  nickname,
  role,
  archive_eligible
)
values
  (
    '32000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    'Host',
    'host',
    true
  ),
  (
    '32000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000002',
    'Member',
    'member',
    true
  ),
  (
    '32000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000001',
    'Host',
    'host',
    true
  ),
  (
    '32000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000002',
    'Member',
    'member',
    false
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  'select count(*) from public.list_current_user_rooms()',
  array[2::bigint],
  'host account can list active and eligible archived rooms'
);

select extensions.results_eq(
  $$select name from public.list_current_user_rooms()
    order by updated_at desc$$,
  array['Active room'::text, 'Archived room'::text],
  'room list has deterministic newest-first order'
);

select extensions.results_eq(
  $$select member_count from public.get_current_user_room(
      'room_be012_active'
    )$$,
  array[2::bigint],
  'room read returns an accurate active member count'
);

select extensions.results_eq(
  $$select viewer_role from public.get_current_user_room(
      'room_be012_active'
    )$$,
  array['host'::text],
  'room read returns the caller membership role'
);

select extensions.results_eq(
  'select count(*) from public.list_current_user_rooms(1)',
  array[1::bigint],
  'page limit is applied'
);

select extensions.results_eq(
  $$with first_page as (
      select updated_at, room_id
      from public.list_current_user_rooms(1)
    )
    select count(*)
    from first_page
    cross join lateral public.list_current_user_rooms(
      1,
      first_page.updated_at,
      first_page.room_id
    ) as next_page$$,
  array[1::bigint],
  'keyset cursor returns the next room'
);

select extensions.throws_ok(
  $$select * from public.list_current_user_rooms(0)$$,
  '22023'
);

select extensions.throws_ok(
  $$select * from public.list_current_user_rooms(
      20,
      '2026-07-27T10:30:00Z',
      null
    )$$,
  '22023'
);

select extensions.throws_ok(
  $$select * from public.get_current_user_room('invalid')$$,
  '22023'
);

select extensions.is_empty(
  $$select * from public.get_current_user_room(
      'room_missing_012'
    )$$,
  'missing room is not distinguishable from an inaccessible room'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"12000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  'select count(*) from public.list_current_user_rooms()',
  array[1::bigint],
  'member without archive eligibility sees only the active room'
);

select extensions.results_eq(
  $$select viewer_role from public.get_current_user_room(
      'room_be012_active'
    )$$,
  array['member'::text],
  'member reads their own role rather than the Host role'
);

select extensions.is_empty(
  $$select * from public.get_current_user_room(
      'room_be012_archive'
    )$$,
  'ineligible archive is hidden'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"12000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.is_empty(
  'select * from public.list_current_user_rooms()',
  'outsider cannot enumerate rooms'
);

select extensions.is_empty(
  $$select * from public.get_current_user_room(
      'room_be012_active'
    )$$,
  'outsider cannot read room detail'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"12000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select extensions.results_eq(
  'select count(*) from public.list_current_user_rooms()',
  array[1::bigint],
  'anonymous Auth identity cannot read archives'
);

select extensions.is_empty(
  $$select * from public.get_current_user_room(
      'room_be012_archive'
    )$$,
  'anonymous Auth identity cannot read one archived room'
);

reset role;

select extensions.results_eq(
  $$select version from private.schema_versions
    where component = 'room_read_models'$$,
  array[1::integer],
  'room read model component version is recorded'
);

select * from extensions.finish();

rollback;
