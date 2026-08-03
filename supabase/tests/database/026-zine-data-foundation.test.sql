begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(30);

select extensions.has_table('public','zines','zines table exists');
select extensions.has_table('public','zine_sources','zine source snapshots exist');
select extensions.has_table('public','zine_source_photos','zine source photos exist');
select extensions.has_table('public','zine_source_texts','zine source texts exist');
select extensions.has_table('public','zine_versions','zine versions exist');
select extensions.has_table('public','zine_generation_jobs','durable generation jobs exist');
select extensions.has_table('public','zine_usage_ledger','usage ledger exists');
select extensions.has_table('public','zine_uploads','standalone upload boundary exists');

select extensions.ok(
  has_function_privilege('authenticated','public.create_zine_draft(text,text,text,text,uuid)','execute'),
  'authenticated users can invoke the guarded draft command'
);
select extensions.ok(
  not has_function_privilege('anon','public.create_zine_draft(text,text,text,text,uuid)','execute'),
  'anonymous requests cannot invoke the draft command'
);
select extensions.ok(
  has_function_privilege('authenticated','public.prepare_zine_photo_upload(text,bigint,bigint,text,integer,integer,uuid)','execute'),
  'authenticated users can invoke guarded standalone upload preparation'
);
select extensions.ok(
  not has_function_privilege('anon','public.enqueue_zine_generation(text,uuid,text,uuid)','execute'),
  'anonymous requests cannot enqueue generation'
);

insert into auth.users(id,email) values
  ('61000000-0000-4000-8000-000000000001','zine-host@example.invalid'),
  ('61000000-0000-4000-8000-000000000002','zine-member@example.invalid'),
  ('61000000-0000-4000-8000-000000000003','zine-outsider@example.invalid');
insert into public.profiles(user_id,display_name) values
  ('61000000-0000-4000-8000-000000000001','Zine Host'),
  ('61000000-0000-4000-8000-000000000002','Zine Member'),
  ('61000000-0000-4000-8000-000000000003','Zine Outsider');
insert into public.actors(id,owner_user_id,kind,is_primary) values
  ('62000000-0000-4000-8000-000000000001','61000000-0000-4000-8000-000000000001','account',true),
  ('62000000-0000-4000-8000-000000000002','61000000-0000-4000-8000-000000000002','account',true),
  ('62000000-0000-4000-8000-000000000003','61000000-0000-4000-8000-000000000003','account',true);
insert into public.rooms(id,public_id,name,time_zone,starts_at,ends_at,status,ended_at,archived_at,member_limit)
values(
  '63000000-0000-4000-8000-000000000001','room_zine_foundation','Finished trip','UTC',
  now()-interval '3 hours',now()-interval '2 hours','archived',now()-interval '2 hours',now()-interval '1 hour',10
);
insert into public.room_members(room_id,actor_id,nickname,role,state,archive_eligible) values
  ('63000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001','Zine Host','host','active',true),
  ('63000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000002','Zine Member','member','active',true);

select set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;

select extensions.lives_ok(
  $$select * from public.create_zine_draft(
    'standalone',null,'My private book','quiet-field','64000000-0000-4000-8000-000000000001')$$,
  'owner can create a standalone private draft'
);
with replay as materialized (
  select * from public.create_zine_draft(
    'standalone',null,'My private book','quiet-field','64000000-0000-4000-8000-000000000001')
)
select extensions.is(
  (select count(*) from public.zines where kind='standalone'),
  1::bigint,
  'replaying a draft command is idempotent'
) from replay;

select extensions.lives_ok(
  $$select * from public.create_zine_draft(
    'room','room_zine_foundation','Finished trip','living-sequence','64000000-0000-4000-8000-000000000002')$$,
  'host can create the one shared zine after the room ends'
);
with existing_room_zine as materialized (
  select * from public.create_zine_draft(
    'room','room_zine_foundation','Different title is ignored','quiet-field','64000000-0000-4000-8000-000000000003')
)
select extensions.is(
  (select count(*) from public.zines where room_id='63000000-0000-4000-8000-000000000001'),
  1::bigint,
  'a room has only one live shared zine'
) from existing_room_zine;

select extensions.lives_ok(
  $$select * from public.prepare_zine_photo_upload(
    (select public_id from public.zines where kind='standalone'),100000,20000,
    'data:image/jpeg;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',1200,800,
    '64000000-0000-4000-8000-000000000004')$$,
  'standalone owner can prepare a private display and thumbnail upload'
);
with replay_upload as materialized (
  select * from public.prepare_zine_photo_upload(
    (select public_id from public.zines where kind='standalone'),100000,20000,
    'data:image/jpeg;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',1200,800,
    '64000000-0000-4000-8000-000000000004')
)
select extensions.is(
  (select count(*) from public.zine_uploads),
  1::bigint,
  'replaying upload preparation does not allocate a second asset'
) from replay_upload;

reset role;
select set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;

select extensions.throws_ok(
  $$select * from public.create_zine_draft(
    'room','room_zine_foundation','Not mine','quiet-field','64000000-0000-4000-8000-000000000005')$$,
  '42501','ended_room_host_required',
  'a Room member cannot create or replace the shared zine'
);
select extensions.is(
  (select count(*) from public.zines where room_id='63000000-0000-4000-8000-000000000001'),
  0::bigint,
  'Room members cannot read an unconfirmed draft'
);

reset role;
insert into public.zine_sources(id,zine_id,status,chapter_basis,consent_version,room_revision,photo_count,frozen_at)
select '65000000-0000-4000-8000-000000000001',id,'frozen','captured-time','consent-v1',1,1,now()
from public.zines where room_id='63000000-0000-4000-8000-000000000001';
insert into public.assets(
  id,owner_actor_id,kind,status,object_key,mime_type,byte_size,
  thumbnail_object_key,thumbnail_byte_size,placeholder_data_url,
  image_width,image_height,ready_at
) values (
  '66000000-0000-4000-8000-000000000001','62000000-0000-4000-8000-000000000001',
  'image','ready','zines/room/source/photo/display.jpg','image/jpeg',100000,
  'zines/room/source/photo/thumbnail.jpg',20000,
  'data:image/jpeg;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',1200,800,now()
);
insert into public.zine_source_photos(
  source_id,asset_id,ordinal,original_name,width,height,alt_text
) values (
  '65000000-0000-4000-8000-000000000001','66000000-0000-4000-8000-000000000001',
  1,'photo.jpg',1200,800,'Selected room photograph'
);
insert into public.zine_versions(zine_id,source_id,version_number,style,template_id,layout_document,status,is_current,ready_at)
select id,'65000000-0000-4000-8000-000000000001',1,'living-sequence','living-sequence-v1','{"version":"1"}'::jsonb,'ready',true,now()
from public.zines where room_id='63000000-0000-4000-8000-000000000001';
update public.zines set status='ready' where room_id='63000000-0000-4000-8000-000000000001';

set local role authenticated;
select extensions.is(
  (select count(*) from public.zines where room_id='63000000-0000-4000-8000-000000000001'),
  1::bigint,
  'Room members can read the confirmed shared zine'
);
select extensions.is(
  (select count(*) from public.zine_versions where is_current),
  1::bigint,
  'Room members can read only the confirmed current version'
);
select extensions.is(
  (select count(*) from public.zine_sources),
  0::bigint,
  'Room members cannot inspect raw source snapshots'
);
select extensions.ok(
  (select security.can_read_zine_asset('zines/room/source/photo/display.jpg')),
  'Room members can read only media used by the confirmed current version'
);

reset role;
select set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select extensions.is((select count(*) from public.zines),0::bigint,'outsiders cannot read private zines');

reset role;
select set_config('request.jwt.claims','{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select extensions.lives_ok(
  $$select * from public.enqueue_zine_generation(
    (select public_id from public.zines where kind='room'),
    '65000000-0000-4000-8000-000000000001','compose','64000000-0000-4000-8000-000000000006')$$,
  'Host can enqueue a frozen source once'
);

reset role;
update public.zine_generation_jobs set status='failed',error_code='provider_timeout',finished_at=now();
set local role authenticated;
with retry as materialized (
  select attempt_count,retried from public.enqueue_zine_generation(
    (select public_id from public.zines where kind='room'),
    '65000000-0000-4000-8000-000000000001','compose','64000000-0000-4000-8000-000000000006')
)
select extensions.is(attempt_count,2,'retry increments the original job attempt') from retry
union all
select extensions.is(retried,true,'retry requeues the same failed job') from retry;

reset role;
insert into public.zine_usage_ledger(job_id,provider_request_id,metric,quantity,cost_micros)
select id,'provider-request-1','input-image',27,12000 from public.zine_generation_jobs limit 1;
select extensions.throws_ok(
  $$insert into public.zine_usage_ledger(job_id,provider_request_id,metric,quantity,cost_micros)
    select id,'provider-request-1','input-image',27,12000 from public.zine_generation_jobs limit 1$$,
  '23505',null,
  'a repeated provider usage event cannot be charged twice'
);
select extensions.is(
  (select version from private.schema_versions where component='zine_data_foundation'),
  1,
  'zine data foundation schema version is recorded'
);

select * from extensions.finish();
rollback;
