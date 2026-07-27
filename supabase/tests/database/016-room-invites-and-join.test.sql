begin;

set local statement_timeout = '20s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(32);

select extensions.ok(
  has_function_privilege(
    'anon',
    'public.preview_room_invite(text,text,text)',
    'execute'
  ),
  'anon can preview a secret-backed invite'
);

select extensions.ok(
  has_function_privilege(
    'anon',
    'public.resolve_room_invite_code(text)',
    'execute'
  ),
  'anon can resolve a valid short invite code'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.create_room_invite(text,text,text)',
    'execute'
  ),
  'anon cannot rotate room invites'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.join_room_with_invite(text,text,text,text,text)',
    'execute'
  ),
  'anon role cannot join without an Auth identity'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.create_room_invite(text,text,text)',
    'execute'
  ),
  'authenticated can call the Host invite command'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.join_room_with_invite(text,text,text,text,text)',
    'execute'
  ),
  'authenticated can call the join command'
);

select extensions.ok(
  not has_table_privilege(
    'authenticated',
    'private.room_invites',
    'select'
  ),
  'clients cannot inspect invite hashes'
);

select extensions.ok(
  not has_table_privilege(
    'authenticated',
    'private.room_join_requests',
    'select'
  ),
  'clients cannot inspect private join requests'
);

select extensions.results_eq(
  $$select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'create_room_invite',
        'preview_room_invite',
        'join_room_with_invite',
        'resolve_room_invite_code'
      )
      and not procedure.prosecdef$$,
  array[4::bigint],
  'public invite wrappers are security invoker'
);

select extensions.results_eq(
  $$select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'security'
      and procedure.proname in (
        'create_room_invite',
        'preview_room_invite',
        'join_room_with_invite',
        'resolve_room_invite_code'
      )
      and procedure.prosecdef
      and procedure.proconfig @> array['search_path=""']::text[]$$,
  array[4::bigint],
  'privileged invite implementations have an empty search path'
);

insert into auth.users (id, email)
values
  ('16000000-0000-4000-8000-000000000001', 'be016-host@example.invalid'),
  ('16000000-0000-4000-8000-000000000002', 'be016-member@example.invalid'),
  ('16000000-0000-4000-8000-000000000003', 'be016-direct@example.invalid'),
  ('16000000-0000-4000-8000-000000000004', 'be016-outsider@example.invalid');

insert into public.profiles (user_id, display_name)
values
  ('16000000-0000-4000-8000-000000000001', 'Host'),
  ('16000000-0000-4000-8000-000000000002', 'Pending member'),
  ('16000000-0000-4000-8000-000000000003', 'Direct member'),
  ('16000000-0000-4000-8000-000000000004', 'Outsider');

insert into public.actors (
  id,
  owner_user_id,
  kind,
  is_primary,
  claimed_at
)
values
  ('26000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'account', true, now()),
  ('26000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000002', 'account', true, now()),
  ('26000000-0000-4000-8000-000000000003', '16000000-0000-4000-8000-000000000003', 'account', true, now()),
  ('26000000-0000-4000-8000-000000000004', '16000000-0000-4000-8000-000000000004', 'account', true, now());

insert into public.rooms (
  id,
  public_id,
  name,
  description,
  time_zone,
  starts_at,
  ends_at,
  member_limit,
  requires_approval
)
values
  (
    '36000000-0000-4000-8000-000000000001',
    'room_be016_approval',
    'Approval room',
    'Host approval required.',
    'UTC',
    now(),
    now() + interval '3 hours',
    6,
    true
  ),
  (
    '36000000-0000-4000-8000-000000000002',
    'room_be016_direct',
    'Direct room',
    'Direct entry.',
    'UTC',
    now(),
    now() + interval '3 hours',
    6,
    false
  );

insert into public.room_members (
  room_id,
  actor_id,
  nickname,
  role,
  archive_eligible
)
values
  ('36000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', 'Host', 'host', true),
  ('36000000-0000-4000-8000-000000000002', '26000000-0000-4000-8000-000000000001', 'Host', 'host', true);

select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select invite_revision from public.create_room_invite(
      'room_be016_approval',
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      'JOIN012A'
    )$$,
  array[1::integer],
  'Host creates the first approval-room invite'
);

select extensions.results_eq(
  $$select invite_revision from public.create_room_invite(
      'room_be016_direct',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'JOIN012B'
    )$$,
  array[1::integer],
  'Host creates the direct-room invite'
);

select extensions.results_eq(
  $$select invite_revision from public.create_room_invite(
      'room_be016_direct',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      'JOIN012B'
    )$$,
  array[1::integer],
  'retrying the same invite secrets is idempotent'
);

select extensions.results_eq(
  $$select invite_revision from public.create_room_invite(
      'room_be016_approval',
      'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      'JOIN012C'
    )$$,
  array[2::integer],
  'rotating an invite advances its revision'
);

reset role;
set local role anon;

select extensions.is_empty(
  $$select * from public.preview_room_invite(
      'room_be016_approval',
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      null
    )$$,
  'revoked raw token no longer previews the room'
);

select extensions.results_eq(
  $$select name from public.preview_room_invite(
      'room_be016_approval',
      'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      null
    )$$,
  array['Approval room'::text],
  'active raw token reveals minimal invite preview'
);

select extensions.results_eq(
  $$select member_count from public.preview_room_invite(
      'room_be016_approval',
      null,
      'JOIN012C'
    )$$,
  array[1::bigint],
  'short code resolves the same active invite'
);

select extensions.results_eq(
  $$select public_id from public.resolve_room_invite_code('JOIN012C')$$,
  array['room_be016_approval'::text],
  'global short-code resolution returns only the matching active room'
);

select extensions.is_empty(
  $$select * from public.preview_room_invite(
      'room_be016_approval',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      null
    )$$,
  'wrong secret does not reveal room metadata'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000004","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.throws_ok(
  $$select * from public.create_room_invite(
      'room_be016_approval',
      'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
      'JOIN012D'
    )$$,
  '42501'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select outcome from public.join_room_with_invite(
      'room_be016_approval',
      'Pending member',
      'Please let me in.',
      'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      null
    )$$,
  array['pending'::text],
  'approval room creates a pending request'
);

reset role;

select extensions.results_eq(
  $$select count(*) from private.room_join_requests
    where room_id = '36000000-0000-4000-8000-000000000001'
      and actor_id = '26000000-0000-4000-8000-000000000002'
      and status = 'pending'$$,
  array[1::bigint],
  'pending request is stored once'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select outcome from public.join_room_with_invite(
      'room_be016_approval',
      'Pending member',
      'Updated note.',
      null,
      'JOIN012C'
    )$$,
  array['pending'::text],
  'pending join retry is idempotent'
);

reset role;

select extensions.results_eq(
  $$select count(*) from private.room_join_requests
    where room_id = '36000000-0000-4000-8000-000000000001'
      and actor_id = '26000000-0000-4000-8000-000000000002'$$,
  array[1::bigint],
  'join retry does not duplicate the request'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select outcome from public.join_room_with_invite(
      'room_be016_direct',
      'Direct member',
      '',
      null,
      'JOIN012B'
    )$$,
  array['joined'::text],
  'direct room atomically creates membership'
);

select extensions.results_eq(
  $$select role from public.room_members
    where room_id = '36000000-0000-4000-8000-000000000002'
      and actor_id = '26000000-0000-4000-8000-000000000003'$$,
  array['member'::text],
  'joined actor receives only the member role'
);

select extensions.results_eq(
  $$select outcome from public.join_room_with_invite(
      'room_be016_direct',
      'Ignored retry name',
      '',
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      null
    )$$,
  array['joined'::text],
  'already joined actor gets an idempotent result'
);

select extensions.throws_ok(
  $$select * from public.join_room_with_invite(
      'room_be016_direct',
      'Another member',
      '',
      'ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ',
      null
    )$$,
  '22023'
);

reset role;

select extensions.results_eq(
  $$select count(*) from private.room_invites
    where status = 'active'$$,
  array[2::bigint],
  'exactly one active invite remains per room'
);

select extensions.results_eq(
  $$select count(*) from private.room_invites
    where status = 'revoked' and revoked_at is not null$$,
  array[1::bigint],
  'rotation retains a revoked audit row without raw secrets'
);

select extensions.results_eq(
  $$select count(*) from private.room_invites
    where token_hash = pg_catalog.convert_to(
      'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      'UTF8'
    )$$,
  array[0::bigint],
  'raw invite token is not stored as its byte representation'
);

select extensions.results_eq(
  $$select version from private.schema_versions
    where component = 'room_invites_and_join'$$,
  array[1::integer],
  'invite and join component version is recorded'
);

select * from extensions.finish();

rollback;
