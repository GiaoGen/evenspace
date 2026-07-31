begin;

set local statement_timeout = '20s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(5);

insert into auth.users (id, email)
values ('1b000000-0000-4000-8000-000000000001', 'room-card-media-025@example.invalid');

insert into public.profiles (user_id, display_name)
values ('1b000000-0000-4000-8000-000000000001', 'Media owner');

insert into public.actors (id, owner_user_id, kind, is_primary, claimed_at)
values (
  '2b000000-0000-4000-8000-000000000001',
  '1b000000-0000-4000-8000-000000000001',
  'account',
  true,
  now()
);

insert into public.rooms (id, public_id, name, time_zone, starts_at, ends_at, member_limit)
values (
  '3b000000-0000-4000-8000-000000000001',
  'room_card_media_025',
  'Full media room',
  'UTC',
  now(),
  now() + interval '2 hours',
  12
);

insert into public.room_members (room_id, actor_id, nickname, role)
values (
  '3b000000-0000-4000-8000-000000000001',
  '2b000000-0000-4000-8000-000000000001',
  'Media owner',
  'host'
);

with new_assets as (
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
  select
    gen_random_uuid(),
    '2b000000-0000-4000-8000-000000000001'::uuid,
    'image',
    'ready',
    format('room-media/025/photo-%s.jpg', photo_number),
    'image/jpeg',
    1024,
    now()
  from generate_series(1, 8) as photo_number
  returning id, object_key
)
insert into public.photos (
  id,
  room_id,
  asset_id,
  owner_actor_id,
  original_name,
  aspect_ratio,
  created_at
)
select
  gen_random_uuid(),
  '3b000000-0000-4000-8000-000000000001'::uuid,
  asset.id,
  '2b000000-0000-4000-8000-000000000001'::uuid,
  split_part(asset.object_key, '/', 3),
  1,
  now() + row_number() over (order by asset.object_key) * interval '1 second'
from new_assets asset;

select extensions.ok(
  has_function_privilege('authenticated', 'public.list_room_card_media(uuid[])', 'execute'),
  'authenticated users can read the room card projection'
);

select extensions.ok(
  not has_function_privilege('anon', 'public.list_room_card_media(uuid[])', 'execute'),
  'anonymous users cannot read the room card projection'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"1b000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  $$select count(*)
    from public.list_room_card_media(
      array['3b000000-0000-4000-8000-000000000001'::uuid]
    )$$,
  array[8::bigint],
  'the projection returns photos beyond the former five-photo limit'
);

select extensions.results_eq(
  $$select distinct photo_count
    from public.list_room_card_media(
      array['3b000000-0000-4000-8000-000000000001'::uuid]
    )$$,
  array[8::bigint],
  'every projected row retains the complete room photo count'
);

reset role;

select extensions.results_eq(
  $$select version
    from private.schema_versions
    where component = 'room_media_read_projection'$$,
  array[2],
  'the complete room media projection schema version is recorded'
);

select * from extensions.finish();
rollback;
