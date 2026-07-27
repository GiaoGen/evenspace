begin;
set local statement_timeout='25s';
set local lock_timeout='5s';
create extension if not exists pgtap with schema extensions;
select extensions.plan(25);

select extensions.ok(has_function_privilege('authenticated','public.review_join_request(text,uuid,text)','execute'),'authenticated can invoke reviewed join command');
select extensions.ok(has_function_privilege('authenticated','public.end_host_led_room(text,uuid)','execute'),'authenticated can invoke host end command');
select extensions.ok(has_function_privilege('authenticated','public.send_room_message(text,text,text,uuid,uuid,uuid)','execute'),'authenticated can invoke chat command');
select extensions.ok(has_function_privilege('authenticated','public.create_itinerary(text,text,text,text,timestamptz,text,timestamptz,uuid,uuid)','execute'),'authenticated can invoke itinerary command');
select extensions.ok(not has_table_privilege('anon','public.messages','select'),'anon cannot read messages');

insert into auth.users(id,email) values
('17000000-0000-4000-8000-000000000001','host18@example.invalid'),
('17000000-0000-4000-8000-000000000002','member18@example.invalid'),
('17000000-0000-4000-8000-000000000003','outside18@example.invalid');
insert into public.profiles(user_id,display_name) values
('17000000-0000-4000-8000-000000000001','Host'),
('17000000-0000-4000-8000-000000000002','Member'),
('17000000-0000-4000-8000-000000000003','Outside');
insert into public.actors(id,owner_user_id,kind,is_primary,claimed_at) values
('27000000-0000-4000-8000-000000000001','17000000-0000-4000-8000-000000000001','account',true,now()),
('27000000-0000-4000-8000-000000000002','17000000-0000-4000-8000-000000000002','account',true,now()),
('27000000-0000-4000-8000-000000000003','17000000-0000-4000-8000-000000000003','account',true,now());
insert into public.rooms(id,public_id,name,time_zone,starts_at,ends_at,member_limit,requires_approval) values
('37000000-0000-4000-8000-000000000001','room_be018_main','Backend room','UTC',now(),now()+interval '3 hours',6,true),
('37000000-0000-4000-8000-000000000002','room_be019_end','Ending room','UTC',now(),now()+interval '3 hours',6,true);
insert into public.room_members(room_id,actor_id,nickname,role) values
('37000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001','Host','host'),
('37000000-0000-4000-8000-000000000002','27000000-0000-4000-8000-000000000001','Host','host');
insert into private.room_invites(id,room_id,revision,token_hash,code_hash,created_by_actor_id)
values('47000000-0000-4000-8000-000000000001','37000000-0000-4000-8000-000000000001',1,'\x01','\x02','27000000-0000-4000-8000-000000000001');
insert into private.room_join_requests(id,room_id,actor_id,invite_id,nickname,note)
values('57000000-0000-4000-8000-000000000001','37000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000002','47000000-0000-4000-8000-000000000001','Member','hello');

select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select extensions.results_eq($$select count(*) from public.list_pending_join_requests('room_be018_main')$$,array[1::bigint],'Host lists pending requests');
select extensions.results_eq($$select outcome from public.review_join_request('room_be018_main','57000000-0000-4000-8000-000000000001','approved')$$,array['approved'::text],'Host approves request');
select extensions.results_eq($$select state from public.room_members where room_id='37000000-0000-4000-8000-000000000001' and actor_id='27000000-0000-4000-8000-000000000002'$$,array['active'::text],'approval creates active membership');
select extensions.results_eq($$select member_state from public.change_room_member_state('room_be018_main','27000000-0000-4000-8000-000000000002','muted')$$,array['muted'::text],'Host can mute member');
select extensions.results_eq($$select status from public.end_host_led_room('room_be019_end','67000000-0000-4000-8000-000000000001')$$,array['freezing'::text],'Host ends room into freezing');
select extensions.results_eq($$select status from public.end_host_led_room('room_be019_end','67000000-0000-4000-8000-000000000001')$$,array['freezing'::text],'end command retry is idempotent');
reset role;
select extensions.results_eq($$select next_status from security.advance_room_lifecycle(10) where room_id='37000000-0000-4000-8000-000000000002'$$,array['archiving'::text],'service lifecycle advances freezing room');
select extensions.results_eq($$select count(*) from pg_policies where schemaname='realtime' and tablename='messages' and policyname='room_members_receive_private_events'$$,array[1::bigint],'private realtime policy exists');
select extensions.ok(has_function_privilege('postgres','private.broadcast_room_event()','execute'),'database owner can emit minimal events');

insert into public.assets(id,owner_actor_id,kind,status,object_key,mime_type,byte_size,duration_ms,ready_at)
values('77000000-0000-4000-8000-000000000001','27000000-0000-4000-8000-000000000001','voice','ready','voice/test.webm','audio/webm',1200,1000,now());
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select extensions.results_eq($$select count(*) from public.send_room_message('room_be018_main','text','Hello',null,null,'87000000-0000-4000-8000-000000000001')$$,array[1::bigint],'member sends text');
select extensions.results_eq($$select count(*) from public.send_room_message('room_be018_main','text','Hello',null,null,'87000000-0000-4000-8000-000000000001')$$,array[1::bigint],'message retry returns original');
select extensions.results_eq($$select active from public.react_to_room_message((select id from public.messages limit 1),'👍',true)$$,array[true],'member reacts');
select extensions.results_eq($$select count(*) from public.pin_room_message('room_be018_main',(select id from public.messages limit 1))$$,array[1::bigint],'Host pins message');
select extensions.results_eq($$select count(*) from public.recall_room_message((select id from public.messages limit 1))$$,array[1::bigint],'author recalls message');
reset role;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000003","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select extensions.throws_ok($$select * from public.send_room_message('room_be018_main','text','No',null,null,'87000000-0000-4000-8000-000000000002')$$,'42501');

reset role;
select set_config('request.jwt.claims','{"sub":"17000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}',true);
set local role authenticated;
select extensions.results_eq($$select revision from public.create_itinerary('room_be018_main','Plan','','',now()-interval '10 minutes','scheduled',now()+interval '40 minutes',null,'97000000-0000-4000-8000-000000000001')$$,array[1::bigint],'member creates itinerary');
select extensions.results_eq($$select revision from public.update_itinerary('97000000-0000-4000-8000-000000000001',1,'Updated','','',now()-interval '10 minutes','manual',null,null)$$,array[2::bigint],'matching revision updates itinerary');
select extensions.throws_ok($$select * from public.update_itinerary('97000000-0000-4000-8000-000000000001',1,'Stale','','',now()-interval '10 minutes','manual',null,null)$$,'40001');
select extensions.results_eq($$select revision from public.end_itinerary('97000000-0000-4000-8000-000000000001',2)$$,array[3::bigint],'manual end advances revision');
reset role;
select extensions.results_eq($$select count(*) from private.schema_versions where component in('member_governance','room_lifecycle','private_realtime','chat_backend','itinerary_backend') and version=1$$,array[5::bigint],'all five backend component versions recorded');
select * from extensions.finish();
rollback;
