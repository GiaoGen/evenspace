begin;

set local statement_timeout = '20s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(15);

select extensions.has_column(
  'public',
  'profiles',
  'avatar_asset_id',
  'profiles store an account avatar asset'
);
select extensions.has_column(
  'public',
  'room_members',
  'avatar_variant',
  'members store their room avatar choice'
);
select extensions.has_column(
  'private',
  'room_join_requests',
  'avatar_variant',
  'pending requests preserve the chosen avatar'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.join_room_with_profile(text,text,text,text,text,text,uuid)',
    'execute'
  ),
  'authenticated identities can join with a room profile'
);
select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.join_room_with_profile(text,text,text,text,text,text,uuid)',
    'execute'
  ),
  'the database anon role cannot join without an Auth identity'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.prepare_profile_avatar_upload(text,bigint)',
    'execute'
  ),
  'authenticated accounts can prepare an avatar upload'
);
select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.prepare_profile_avatar_upload(text,bigint)',
    'execute'
  ),
  'the database anon role cannot prepare an avatar upload'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.get_join_request_status(text,uuid)',
    'execute'
  ),
  'authenticated request owners can poll join status'
);
select extensions.results_eq(
  $$select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'prepare_profile_avatar_upload',
        'finalize_profile_avatar_upload',
        'join_room_with_profile',
        'list_pending_join_requests_with_avatar',
        'get_join_request_status'
      )
      and not procedure.prosecdef$$,
  array[5::bigint],
  'public wrappers remain security invoker'
);

insert into auth.users (id, email)
values
  ('19000000-0000-4000-8000-000000000001', 'host23@example.invalid'),
  ('19000000-0000-4000-8000-000000000002', 'guest23@example.invalid');

insert into public.profiles (user_id, display_name)
values
  ('19000000-0000-4000-8000-000000000001', 'Host'),
  ('19000000-0000-4000-8000-000000000002', 'Guest');

insert into public.actors (
  id,
  owner_user_id,
  kind,
  is_primary,
  claimed_at
)
values
  (
    '29000000-0000-4000-8000-000000000001',
    '19000000-0000-4000-8000-000000000001',
    'account',
    true,
    now()
  ),
  (
    '29000000-0000-4000-8000-000000000002',
    '19000000-0000-4000-8000-000000000002',
    'guest',
    true,
    now()
  );

insert into public.rooms (
  id,
  public_id,
  name,
  time_zone,
  starts_at,
  ends_at,
  member_limit,
  requires_approval
)
values (
  '39000000-0000-4000-8000-000000000001',
  'room_avatar_023',
  'Avatar room',
  'UTC',
  now(),
  now() + interval '3 hours',
  6,
  true
);

insert into public.room_members (room_id, actor_id, nickname, role)
values (
  '39000000-0000-4000-8000-000000000001',
  '29000000-0000-4000-8000-000000000001',
  'Host',
  'host'
);

insert into private.room_invites (
  id,
  room_id,
  revision,
  token_hash,
  code_hash,
  created_by_actor_id
)
values (
  '49000000-0000-4000-8000-000000000001',
  '39000000-0000-4000-8000-000000000001',
  1,
  '\x01',
  '\x02',
  '29000000-0000-4000-8000-000000000001'
);

insert into private.room_join_requests (
  id,
  room_id,
  actor_id,
  invite_id,
  nickname,
  note,
  avatar_variant
)
values (
  '59000000-0000-4000-8000-000000000001',
  '39000000-0000-4000-8000-000000000001',
  '29000000-0000-4000-8000-000000000002',
  '49000000-0000-4000-8000-000000000001',
  'Guest',
  'hello',
  'ring'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"19000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select avatar_variant
    from public.list_pending_join_requests_with_avatar('room_avatar_023')$$,
  array['ring'::text],
  'Host sees the pending avatar choice'
);
select extensions.results_eq(
  $$select outcome
    from public.review_join_request(
      'room_avatar_023',
      '59000000-0000-4000-8000-000000000001',
      'approved'
    )$$,
  array['approved'::text],
  'Host approves the profiled request'
);

reset role;

select extensions.results_eq(
  $$select avatar_variant
    from public.room_members
    where room_id = '39000000-0000-4000-8000-000000000001'
      and actor_id = '29000000-0000-4000-8000-000000000002'$$,
  array['ring'::text],
  'approval copies the pending avatar onto membership'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"19000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select request_status
    from public.get_join_request_status(
      'room_avatar_023',
      '59000000-0000-4000-8000-000000000001'
    )$$,
  array['approved'::text],
  'request owner can observe the approval'
);
select extensions.throws_ok(
  $$select *
    from public.prepare_profile_avatar_upload('image/png', 1024)$$,
  '42501',
  'permanent_account_required',
  'anonymous users cannot upload account avatars'
);

reset role;

select extensions.results_eq(
  $$select version
    from private.schema_versions
    where component = 'room_identity_avatars_and_guest_join'$$,
  array[1],
  'avatar and guest join schema version is recorded'
);

select * from extensions.finish();
rollback;
