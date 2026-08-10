begin;

set local statement_timeout = '20s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(20);

select extensions.has_column(
  'public',
  'room_members',
  'is_favorite',
  'room membership stores a favorite preference'
);
select extensions.has_column(
  'public',
  'room_members',
  'hidden_at',
  'room membership stores personal list visibility'
);

select extensions.ok(
  not has_function_privilege('anon', 'public.set_current_user_room_favorite(text,boolean)', 'execute'),
  'anon cannot update room favorites'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.set_current_user_room_hidden(text,boolean)', 'execute'),
  'anon cannot hide rooms'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.set_current_user_room_favorite(text,boolean)', 'execute'),
  'authenticated can update room favorites'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.set_current_user_room_hidden(text,boolean)', 'execute'),
  'authenticated can hide rooms'
);

select extensions.results_eq(
  $$select count(*) from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in ('set_current_user_room_favorite', 'set_current_user_room_hidden')
      and not procedure.prosecdef$$,
  array[2::bigint],
  'public preference wrappers are security invoker'
);
select extensions.results_eq(
  $$select count(*) from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'security'
      and procedure.proname in ('set_current_user_room_favorite', 'set_current_user_room_hidden')
      and procedure.prosecdef
      and procedure.proconfig @> array['search_path=""']::text[]$$,
  array[2::bigint],
  'preference implementations are privileged with an empty search path'
);

insert into auth.users (id, email) values
  ('16000000-0000-4000-8000-000000000001', 'be026-owner@example.invalid'),
  ('16000000-0000-4000-8000-000000000002', 'be026-outsider@example.invalid');
insert into public.profiles (user_id, display_name) values
  ('16000000-0000-4000-8000-000000000001', 'Owner'),
  ('16000000-0000-4000-8000-000000000002', 'Outsider');
insert into public.actors (id, owner_user_id, kind, is_primary, claimed_at) values
  ('26000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'account', true, now()),
  ('26000000-0000-4000-8000-000000000002', '16000000-0000-4000-8000-000000000002', 'account', true, now());
insert into public.rooms (id, public_id, name, status, time_zone, ends_at, member_limit) values
  ('36000000-0000-4000-8000-000000000001', 'room_be026_preferences', 'Preference room', 'active', 'UTC', now() + interval '1 hour', 6);
insert into public.room_members (room_id, actor_id, nickname, role) values
  ('36000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', 'Owner', 'host');

select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select viewer_is_favorite from public.list_current_user_rooms()$$,
  array[false],
  'favorites default to false'
);
select extensions.results_eq(
  $$select is_favorite from public.set_current_user_room_favorite('room_be026_preferences', true)$$,
  array[true],
  'current member can favorite a room'
);
select extensions.results_eq(
  $$select viewer_is_favorite from public.get_current_user_room('room_be026_preferences')$$,
  array[true],
  'favorite state is projected by room reads'
);
select extensions.results_eq(
  $$select hidden_at is not null from public.set_current_user_room_hidden('room_be026_preferences', true)$$,
  array[true],
  'current member can hide a room'
);
select extensions.results_eq(
  $$select count(*) from public.list_current_user_rooms()$$,
  array[0::bigint],
  'hidden room is absent from the Rooms collection'
);
select extensions.results_eq(
  $$select count(*) from public.get_current_user_room('room_be026_preferences')$$,
  array[1::bigint],
  'hidden room remains readable by direct room route'
);
select extensions.results_eq(
  $$select viewer_is_favorite from public.get_current_user_room('room_be026_preferences')$$,
  array[false],
  'hiding a room clears its favorite preference'
);
select extensions.results_eq(
  $$select hidden_at is null from public.set_current_user_room_hidden('room_be026_preferences', false)$$,
  array[true],
  'current member can restore collection visibility'
);
select extensions.results_eq(
  $$select count(*) from public.list_current_user_rooms()$$,
  array[1::bigint],
  'restored room returns to the Rooms collection'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"16000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.throws_ok(
  $$select * from public.set_current_user_room_favorite('room_be026_preferences', true)$$,
  '42501'
);
select extensions.throws_ok(
  $$select * from public.set_current_user_room_hidden('room_be026_preferences', true)$$,
  '42501'
);

reset role;
select extensions.results_eq(
  $$select version from private.schema_versions where component = 'room_member_preferences'$$,
  array[1::integer],
  'room member preference component version is recorded'
);

select * from extensions.finish();

rollback;
