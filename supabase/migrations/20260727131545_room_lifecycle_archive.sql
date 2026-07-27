create function security.end_host_led_room(requested_room_public_id text, requested_idempotency_key uuid)
returns table (room_id uuid, public_id text, status text, revision bigint)
language plpgsql security definer set search_path = ''
as $$
declare caller_actor_id uuid; selected_room public.rooms%rowtype; previous jsonb; now_at timestamptz := statement_timestamp();
begin
  if requested_idempotency_key is null then raise exception using errcode='22023',message='invalid_idempotency_key'; end if;
  select actor.id into caller_actor_id from public.actors actor
  where actor.owner_user_id=(select auth.uid()) and actor.is_primary and actor.kind='account' limit 1;
  if caller_actor_id is null then raise exception using errcode='42501',message='authentication_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('eventspace:end-room:'||caller_actor_id||':'||requested_idempotency_key,0));
  select receipt.result into previous from private.command_receipts receipt
  where receipt.actor_id=caller_actor_id and receipt.command_name='end_room' and receipt.idempotency_key=requested_idempotency_key;
  if previous is not null then return query select (previous->>'room_id')::uuid,previous->>'public_id',previous->>'status',(previous->>'revision')::bigint; return; end if;
  select room.* into selected_room from public.rooms room where room.public_id=requested_room_public_id for update;
  if selected_room.id is null or not (select security.is_room_host(selected_room.id)) then raise exception using errcode='42501',message='host_permission_required'; end if;
  if selected_room.status='active' then
    update public.rooms room set status='freezing',ended_at=now_at,end_reason='host_ended',ended_by_actor_id=caller_actor_id,revision=room.revision+1
    where room.id=selected_room.id returning room.* into selected_room;
  end if;
  insert into private.command_receipts(actor_id,command_name,idempotency_key,result)
  values(caller_actor_id,'end_room',requested_idempotency_key,pg_catalog.jsonb_build_object('room_id',selected_room.id,'public_id',selected_room.public_id,'status',selected_room.status,'revision',selected_room.revision));
  return query select selected_room.id,selected_room.public_id,selected_room.status,selected_room.revision;
end;
$$;

create function security.advance_room_lifecycle(requested_limit integer default 100)
returns table (room_id uuid, previous_status text, next_status text)
language plpgsql security definer set search_path = ''
as $$
declare item record; next_value text; now_at timestamptz:=statement_timestamp();
begin
  if current_user not in ('postgres','service_role','supabase_admin') then raise exception using errcode='42501',message='service_role_required'; end if;
  if requested_limit not between 1 and 500 then raise exception using errcode='22023',message='invalid_limit'; end if;
  for item in
    select room.id,room.status from public.rooms room
    where (room.status='active' and room.ends_at<=now_at) or room.status in ('freezing','archiving')
    order by room.ends_at,room.id for update skip locked limit requested_limit
  loop
    next_value:=case item.status when 'active' then 'freezing' when 'freezing' then 'archiving' when 'archiving' then 'archived' end;
    update public.rooms room set status=next_value,
      ended_at=case when item.status='active' then coalesce(room.ended_at,now_at) else room.ended_at end,
      end_reason=case when item.status='active' then coalesce(room.end_reason,'expired') else room.end_reason end,
      archive_started_at=case when next_value='archiving' then coalesce(room.archive_started_at,now_at) else room.archive_started_at end,
      archived_at=case when next_value='archived' then coalesce(room.archived_at,now_at) else room.archived_at end,
      purge_after=case when next_value='archived' then coalesce(room.purge_after,now_at+interval '30 days') else room.purge_after end,
      revision=room.revision+1 where room.id=item.id;
    if next_value='archived' then update public.room_members set archive_eligible=true where room_id=item.id and state in ('active','muted'); end if;
    return query select item.id,item.status,next_value;
  end loop;
end;
$$;

create function public.end_host_led_room(requested_room_public_id text, requested_idempotency_key uuid)
returns table(room_id uuid,public_id text,status text,revision bigint)
language sql security invoker set search_path='' as $$ select * from security.end_host_led_room(requested_room_public_id,requested_idempotency_key); $$;
revoke all on function security.end_host_led_room(text,uuid) from public,anon,service_role;
grant execute on function security.end_host_led_room(text,uuid) to authenticated;
revoke all on function public.end_host_led_room(text,uuid) from public,anon,service_role;
grant execute on function public.end_host_led_room(text,uuid) to authenticated;
revoke all on function security.advance_room_lifecycle(integer) from public,anon,authenticated;
grant execute on function security.advance_room_lifecycle(integer) to service_role;

insert into private.schema_versions(component,version) values('room_lifecycle',1)
on conflict(component) do update set version=excluded.version,applied_at=now();
