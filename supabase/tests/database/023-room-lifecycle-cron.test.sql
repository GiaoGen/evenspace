begin;
set local statement_timeout = '25s';
set local lock_timeout = '5s';
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

select extensions.ok(
  exists(select 1 from pg_extension where extname = 'pg_cron'),
  'pg_cron is installed'
);
select extensions.results_eq(
  $$select count(*) from cron.job where jobname = 'eventspace-room-lifecycle' and active$$,
  array[1::bigint],
  'one active lifecycle job is scheduled'
);
select extensions.results_eq(
  $$select schedule from cron.job where jobname = 'eventspace-room-lifecycle'$$,
  array['* * * * *'::text],
  'lifecycle job runs every minute'
);
select extensions.results_eq(
  $$select command from cron.job where jobname = 'eventspace-room-lifecycle'$$,
  array['select security.run_room_lifecycle_maintenance(500)'::text],
  'lifecycle job calls the bounded maintenance function'
);
select extensions.ok(
  not has_function_privilege('authenticated', 'security.run_room_lifecycle_maintenance(integer)', 'execute'),
  'authenticated users cannot run lifecycle maintenance'
);

insert into auth.users(id, email)
values ('17100000-0000-4000-8000-000000000001', 'host23@example.invalid');
insert into public.profiles(user_id, display_name)
values ('17100000-0000-4000-8000-000000000001', 'Lifecycle Host');
insert into public.actors(id, owner_user_id, kind, is_primary, claimed_at)
values (
  '27100000-0000-4000-8000-000000000001',
  '17100000-0000-4000-8000-000000000001',
  'account',
  true,
  now()
);
insert into public.rooms(
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
  '37100000-0000-4000-8000-000000000001',
  'room_be023_expired',
  'Expired lifecycle room',
  'UTC',
  now() - interval '1 hour',
  now() - interval '30 minutes',
  6,
  true
);
insert into public.room_members(room_id, actor_id, nickname, role)
values (
  '37100000-0000-4000-8000-000000000001',
  '27100000-0000-4000-8000-000000000001',
  'Lifecycle Host',
  'host'
);

select extensions.lives_ok(
  $$select security.run_room_lifecycle_maintenance(10)$$,
  'maintenance processes an expired room'
);
select extensions.results_eq(
  $$select status from public.rooms where id = '37100000-0000-4000-8000-000000000001'$$,
  array['archived'::text],
  'one maintenance run fully archives an expired room'
);
select extensions.results_eq(
  $$select archive_eligible from public.room_members where room_id = '37100000-0000-4000-8000-000000000001'$$,
  array[true],
  'archived room members become eligible for the private archive'
);

select * from extensions.finish();
rollback;
