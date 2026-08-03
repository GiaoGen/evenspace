begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
create extension if not exists pgtap with schema extensions;
select extensions.plan(19);

select extensions.has_table('public','zine_draft_photos','manual draft selections exist');
select extensions.has_function('public','get_zine_studio',array['text'],'studio read command exists');
select extensions.has_function('public','save_zine_manual_draft',array['text','text','text','jsonb'],'manual save command exists');
select extensions.has_function('public','publish_zine_deterministic',array['text','text','jsonb'],'deterministic publish command exists');
select extensions.ok(has_function_privilege('authenticated','public.save_zine_manual_draft(text,text,text,jsonb)','execute'),'authenticated can invoke guarded save');
select extensions.ok(not has_function_privilege('anon','public.save_zine_manual_draft(text,text,text,jsonb)','execute'),'anonymous cannot save a draft');

insert into auth.users(id,email) values
 ('81000000-0000-4000-8000-000000000001','manual-host@example.invalid'),
 ('81000000-0000-4000-8000-000000000002','manual-member@example.invalid');
insert into public.profiles(user_id,display_name) values
 ('81000000-0000-4000-8000-000000000001','Manual Host'),
 ('81000000-0000-4000-8000-000000000002','Manual Member');
insert into public.actors(id,owner_user_id,kind,is_primary) values
 ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','account',true),
 ('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000002','account',true);
insert into public.rooms(id,public_id,name,time_zone,starts_at,ends_at,status,ended_at,archived_at,member_limit)
values('83000000-0000-4000-8000-000000000001','room_manual_zine','Manual trip','UTC',now()-interval '4 hours',now()-interval '2 hours','archived',now()-interval '2 hours',now()-interval '1 hour',10);
insert into public.room_members(room_id,actor_id,nickname,role,state,archive_eligible) values
 ('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','Manual Host','host','active',true),
 ('83000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','Manual Member','member','active',true);
insert into public.assets(id,owner_actor_id,kind,status,object_key,mime_type,byte_size,thumbnail_object_key,thumbnail_byte_size,placeholder_data_url,image_width,image_height,ready_at) values
 ('84000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','image','ready','rooms/manual/photo-1/display.jpg','image/jpeg',100000,'rooms/manual/photo-1/thumbnail.jpg',10000,'data:image/jpeg;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',1600,900,now()),
 ('84000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','image','ready','rooms/manual/photo-2/display.jpg','image/jpeg',100000,'rooms/manual/photo-2/thumbnail.jpg',10000,'data:image/jpeg;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',900,1600,now());
insert into public.photos(id,room_id,asset_id,owner_actor_id,original_name,aspect_ratio,created_at) values
 ('85000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','first.jpg',1.777,now()-interval '3 hours'),
 ('85000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001','second.jpg',0.5625,now()-interval '2 hours');
insert into public.photo_comments(id,room_id,photo_id,actor_id,body) values
 ('86000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','85000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','The light stayed with us.');

select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select extensions.lives_ok($$select * from public.create_zine_draft('room','room_manual_zine','Manual trip','quiet-field','87000000-0000-4000-8000-000000000001')$$,'Host creates the shared draft');
select extensions.lives_ok(format($q$select * from public.save_zine_manual_draft(%L,'Manual trip','quiet-field',%L::jsonb)$q$,
  (select public_id from public.zines where room_id='83000000-0000-4000-8000-000000000001'),
  '[{"sourceId":"85000000-0000-4000-8000-000000000001","textKind":"comment","commentId":"86000000-0000-4000-8000-000000000001","reflection":null},{"sourceId":"85000000-0000-4000-8000-000000000002","textKind":"reflection","commentId":null,"reflection":"We carried the evening home."}]'),
  'Host saves two selected photographs');
select extensions.is((select count(*) from public.zine_draft_photos),2::bigint,'two draft rows are stored');
select extensions.is((select count(*) from public.zine_draft_photos where text_kind='reflection'),1::bigint,'reflection choice is stored');
select extensions.is((select jsonb_array_length(security.get_zine_studio((select public_id from public.zines limit 1))->'photos')),2,'studio returns real room photographs');

select extensions.lives_ok(format($q$select * from public.publish_zine_deterministic(%L,'captured-time',%L::jsonb)$q$,
  (select public_id from public.zines where room_id='83000000-0000-4000-8000-000000000001'),
  '{"version":"1","style":"quiet-field","texts":[{"photoId":"85000000-0000-4000-8000-000000000001","kind":"comment","body":"The light stayed with us."},{"photoId":"85000000-0000-4000-8000-000000000002","kind":"reflection","body":"We carried the evening home."}]}'),
  'Host publishes the deterministic fallback');
select extensions.is((select status from public.zines where room_id='83000000-0000-4000-8000-000000000001'),'ready','zine becomes ready');
select extensions.is((select photo_count from public.zine_sources),2::smallint,'frozen source contains both photos');
select extensions.is((select count(*) from public.zine_versions where status='ready' and is_current),1::bigint,'one current ready version exists');
select extensions.is((select author_display_name from public.zine_source_texts where kind='comment'),'Manual Member','comment keeps author name');
select extensions.is((select author_display_name from public.zine_source_texts where kind='reflection'),null,'reflection omits author name');

reset role;
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select extensions.is((select count(*) from public.get_zine_asset_path((select public_id from public.zines limit 1),'84000000-0000-4000-8000-000000000001')),1::bigint,'Room member can resolve confirmed private media');
select extensions.throws_ok(format($q$select * from public.save_zine_manual_draft(%L,'Changed','quiet-field','[]'::jsonb)$q$,(select public_id from public.zines limit 1)),'42501','zine_manage_permission_required','Room member cannot edit the shared zine');

select * from extensions.finish();
rollback;
