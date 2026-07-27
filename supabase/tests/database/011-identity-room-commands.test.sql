begin;

set local statement_timeout = '20s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(30);

insert into auth.users (id, email)
values
  (
    '11000000-0000-4000-8000-000000000001',
    'be011-primary@example.invalid'
  ),
  (
    '11000000-0000-4000-8000-000000000002',
    'be011-no-identity@example.invalid'
  );

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.bootstrap_identity(text,text)',
    'execute'
  ),
  'anon cannot execute identity bootstrap'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.create_host_led_room(text,text,text,integer,integer,boolean,uuid)',
    'execute'
  ),
  'anon cannot execute create room'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.bootstrap_identity(text,text)',
    'execute'
  ),
  'authenticated can execute identity bootstrap'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.create_host_led_room(text,text,text,integer,integer,boolean,uuid)',
    'execute'
  ),
  'authenticated can execute create room'
);

select extensions.ok(
  not has_table_privilege(
    'authenticated',
    'private.command_receipts',
    'select'
  ),
  'authenticated cannot inspect command receipts'
);

select extensions.results_eq(
  $$select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'bootstrap_identity',
        'create_host_led_room'
      )
      and not procedure.prosecdef$$,
  array[2::bigint],
  'public RPC wrappers are security invoker'
);

select extensions.results_eq(
  $$select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'security'
      and procedure.proname in (
        'bootstrap_identity',
        'create_host_led_room'
      )
      and procedure.prosecdef
      and procedure.proconfig @> array['search_path=""']::text[]$$,
  array[2::bigint],
  'privileged implementations have an empty search path'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select extensions.lives_ok(
  $$select * from public.bootstrap_identity('First Guest', 'dark')$$,
  'an anonymous Auth user can bootstrap identity'
);

select extensions.results_eq(
  'select count(*) from public.profiles',
  array[1::bigint],
  'bootstrap creates one owned profile'
);

select extensions.results_eq(
  'select kind from public.actors',
  array['guest'::text],
  'anonymous bootstrap creates a guest actor'
);

select extensions.lives_ok(
  $$select * from public.bootstrap_identity('Changed On Retry', 'light')$$,
  'identity bootstrap is retry safe'
);

select extensions.results_eq(
  'select display_name from public.profiles',
  array['First Guest'::text],
  'bootstrap retry does not overwrite profile choices'
);

select extensions.results_eq(
  'select count(*) from public.actors',
  array[1::bigint],
  'bootstrap retry does not create a second actor'
);

select extensions.throws_ok(
  $$select * from public.create_host_led_room(
      'Anonymous room',
      '',
      'UTC',
      60,
      4,
      true,
      '41000000-0000-4000-8000-000000000001'
    )$$,
  '42501'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.lives_ok(
  $$select * from public.bootstrap_identity('Permanent Account', 'system')$$,
  'permanent login upgrades the existing identity'
);

select extensions.results_eq(
  'select count(*) from public.actors',
  array[1::bigint],
  'identity upgrade preserves the stable actor'
);

select extensions.results_eq(
  $$select count(*) from public.actors
    where kind = 'account' and claimed_at is not null$$,
  array[1::bigint],
  'identity upgrade marks the actor as claimed account'
);

select extensions.results_eq(
  $$select created from public.create_host_led_room(
      'Launch room',
      'Created by the transactional command.',
      'UTC',
      180,
      6,
      true,
      '41000000-0000-4000-8000-000000000002'
    )$$,
  array[true],
  'first create-room command creates a room'
);

select extensions.results_eq(
  'select count(*) from public.rooms',
  array[1::bigint],
  'creator can read the created room'
);

select extensions.results_eq(
  $$select count(*) from public.room_members
    where role = 'host' and state = 'active'$$,
  array[1::bigint],
  'create-room atomically creates the Host membership'
);

reset role;

select extensions.results_eq(
  $$select count(*) from private.command_receipts
    where command_name = 'create_room'
      and idempotency_key =
        '41000000-0000-4000-8000-000000000002'$$,
  array[1::bigint],
  'create-room records one idempotent result'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select created from public.create_host_led_room(
      'Ignored retry name',
      'Ignored retry description.',
      'UTC',
      60,
      2,
      false,
      '41000000-0000-4000-8000-000000000002'
    )$$,
  array[false],
  'same idempotency key returns the original room'
);

select extensions.results_eq(
  'select count(*) from public.rooms',
  array[1::bigint],
  'idempotent retry does not duplicate the room'
);

select extensions.results_eq(
  $$select name from public.rooms$$,
  array['Launch room'::text],
  'idempotent retry cannot mutate the original result'
);

select extensions.throws_ok(
  $$select * from public.create_host_led_room(
      'Bad timezone',
      '',
      'Not/A_Timezone',
      60,
      4,
      true,
      '41000000-0000-4000-8000-000000000003'
    )$$,
  '22023'
);

select extensions.throws_ok(
  $$select * from public.create_host_led_room(
      'Bad duration',
      '',
      'UTC',
      1,
      4,
      true,
      '41000000-0000-4000-8000-000000000004'
    )$$,
  '22023'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.throws_ok(
  $$select * from public.create_host_led_room(
      'Missing identity',
      '',
      'UTC',
      60,
      4,
      true,
      '41000000-0000-4000-8000-000000000005'
    )$$,
  'P0002'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select created from public.create_host_led_room(
      'Second room',
      '',
      'America/New_York',
      1440,
      10,
      false,
      '41000000-0000-4000-8000-000000000006'
    )$$,
  array[true],
  'a different idempotency key creates another room'
);

select extensions.results_eq(
  'select count(*) from public.rooms',
  array[2::bigint],
  'creator now has exactly two rooms'
);

select extensions.results_eq(
  $$select count(*) from public.rooms
    where mode = 'host-led'
      and status = 'active'
      and revision = 1$$,
  array[2::bigint],
  'the command controls mode status and revision'
);

reset role;

select * from extensions.finish();

rollback;
