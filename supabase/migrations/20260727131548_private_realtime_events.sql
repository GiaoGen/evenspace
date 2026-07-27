create policy room_members_receive_private_events
on realtime.messages for select to authenticated
using (
  (select realtime.topic()) ~ '^room:[0-9a-f-]{36}:events$'
  and (select security.can_read_room(
    pg_catalog.split_part((select realtime.topic()), ':', 2)::uuid
  ))
);

create function private.broadcast_room_event()
returns trigger language plpgsql security definer set search_path=''
as $$
declare row_data jsonb:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_room_id uuid; entity_id text;
begin
  target_room_id:=(row_data->>'room_id')::uuid;
  if target_room_id is null and tg_table_name='rooms' then target_room_id:=(row_data->>'id')::uuid; end if;
  if target_room_id is null and tg_table_name='message_reactions' then
    select message.room_id into target_room_id from public.messages message
    where message.id=(row_data->>'message_id')::uuid;
  end if;
  entity_id:=coalesce(row_data->>'id',row_data->>'actor_id',row_data->>'public_id');
  perform realtime.send(
    pg_catalog.jsonb_build_object(
      'event_id',gen_random_uuid(),'entity_type',tg_table_name,'entity_id',entity_id,
      'operation',lower(tg_op),'revision',coalesce((row_data->>'revision')::bigint,1),
      'occurred_at',statement_timestamp()
    ),
    'room_changed','room:'||target_room_id::text||':events',true
  );
  return null;
end;
$$;
revoke all on function private.broadcast_room_event() from public,anon,authenticated,service_role;

create trigger rooms_private_event after update on public.rooms
for each row execute function private.broadcast_room_event();
create trigger room_members_private_event after insert or update on public.room_members
for each row execute function private.broadcast_room_event();
create trigger room_join_requests_private_event after insert or update on private.room_join_requests
for each row execute function private.broadcast_room_event();

insert into private.schema_versions(component,version) values('private_realtime',1)
on conflict(component) do update set version=excluded.version,applied_at=now();
