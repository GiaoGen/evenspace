begin;

set local statement_timeout = '20s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(21);

insert into auth.users (id, email)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'be010-host@example.invalid'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'be010-member@example.invalid'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'be010-outsider@example.invalid'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'be010-anonymous@example.invalid'
  );

insert into public.actors (
  id,
  owner_user_id,
  kind,
  claimed_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'account',
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'account',
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    'account',
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    'guest',
    null
  );

insert into public.rooms (
  id,
  public_id,
  name,
  description,
  status,
  time_zone,
  starts_at,
  ends_at,
  archive_started_at,
  archived_at,
  purge_after,
  member_limit,
  member_list_visibility
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    'room_be010_shared',
    'Shared active room',
    '',
    'active',
    'UTC',
    now(),
    now() + interval '2 hours',
    null,
    null,
    null,
    10,
    'members'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'room_be010_outsider',
    'Outsider active room',
    '',
    'active',
    'UTC',
    now(),
    now() + interval '2 hours',
    null,
    null,
    null,
    10,
    'members'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    'room_be010_archived',
    'Archived room',
    '',
    'archived',
    'UTC',
    now() - interval '3 hours',
    now() - interval '1 hour',
    now() - interval '55 minutes',
    now() - interval '50 minutes',
    now() + interval '30 days',
    10,
    'members'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    'room_be010_guest',
    'Anonymous active room',
    '',
    'active',
    'UTC',
    now(),
    now() + interval '2 hours',
    null,
    null,
    null,
    10,
    'members'
  );

insert into public.room_members (
  room_id,
  actor_id,
  nickname,
  role,
  state,
  removed_at,
  archive_eligible
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Host',
    'host',
    'active',
    null,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'Member',
    'member',
    'active',
    null,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000004',
    'Removed guest',
    'member',
    'removed',
    now(),
    false
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    'Outsider',
    'host',
    'active',
    null,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'Host',
    'host',
    'active',
    null,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    'Member',
    'member',
    'active',
    null,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000004',
    'Anonymous guest',
    'member',
    'active',
    null,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    'Host',
    'host',
    'active',
    null,
    false
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000004',
    'Anonymous guest',
    'member',
    'active',
    null,
    false
  );

select extensions.ok(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anon has no profile table access'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.rooms', 'select'),
  'anon has no room table access'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.rooms', 'insert'),
  'authenticated users cannot insert rooms directly'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.rooms', 'update'),
  'authenticated users cannot update rooms directly'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  'select count(*) from public.rooms',
  array[3::bigint],
  'the host reads only their three member rooms'
);

select extensions.results_eq(
  $$select count(*) from public.room_members
    where room_id = '30000000-0000-4000-8000-000000000001'$$,
  array[3::bigint],
  'the host can inspect removed members in their room'
);

select extensions.results_eq(
  'select count(*) from public.actors',
  array[1::bigint],
  'the host reads only their owned actor'
);

select extensions.lives_ok(
  $$insert into public.profiles (user_id, display_name, theme)
    values (
      '10000000-0000-4000-8000-000000000001',
      'Host Profile',
      'system'
    )$$,
  'a user can create their own profile'
);

select extensions.results_eq(
  'select count(*) from public.profiles',
  array[1::bigint],
  'a user reads only their own profile'
);

select extensions.throws_ok(
  $$insert into public.profiles (user_id, display_name, theme)
    values (
      '10000000-0000-4000-8000-000000000002',
      'Forged Profile',
      'system'
    )$$,
  '42501'
);

select extensions.throws_ok(
  $$insert into public.rooms (
      name,
      description,
      time_zone,
      ends_at,
      member_limit
    )
    values (
      'Direct room',
      '',
      'UTC',
      now() + interval '1 hour',
      4
    )$$,
  '42501'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  'select count(*) from public.rooms',
  array[2::bigint],
  'a permanent member reads their active and eligible archived rooms'
);

select extensions.results_eq(
  $$select count(*) from public.room_members
    where room_id = '30000000-0000-4000-8000-000000000001'$$,
  array[2::bigint],
  'a member sees active members but not removed members'
);

select extensions.results_eq(
  'select count(*) from public.actors',
  array[1::bigint],
  'a member cannot enumerate other actors'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  'select count(*) from public.rooms',
  array[1::bigint],
  'an outsider reads only their own room'
);

select extensions.results_eq(
  $$select count(*) from public.room_members
    where room_id = '30000000-0000-4000-8000-000000000001'$$,
  array[0::bigint],
  'an outsider cannot enumerate another room membership'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select extensions.results_eq(
  'select count(*) from public.rooms',
  array[1::bigint],
  'an anonymous Auth member reads their active room'
);

select extensions.results_eq(
  $$select count(*) from public.rooms
    where id = '30000000-0000-4000-8000-000000000003'$$,
  array[0::bigint],
  'an anonymous Auth member cannot read archived rooms'
);

reset role;

select extensions.throws_ok(
  $$insert into public.room_members (
      room_id,
      actor_id,
      nickname,
      role,
      state,
      archive_eligible
    )
    values (
      '30000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000003',
      'Second host',
      'host',
      'active',
      true
    )$$,
  '23505'
);

select extensions.throws_ok(
  $$insert into public.rooms (
      name,
      description,
      mode,
      time_zone,
      ends_at,
      member_limit
    )
    values (
      'Community room',
      '',
      'community-led',
      'UTC',
      now() + interval '1 hour',
      4
    )$$,
  '23514'
);

select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);
set local role service_role;

select extensions.results_eq(
  'select count(*) from public.rooms',
  array[4::bigint],
  'the server-only admin role can read every room'
);

reset role;

select * from extensions.finish();

rollback;
