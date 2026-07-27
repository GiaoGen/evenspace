drop function public.send_room_message(text,text,text,uuid,uuid,uuid);
drop function public.recall_room_message(uuid);
drop function public.react_to_room_message(uuid,text,boolean);
drop function public.pin_room_message(text,uuid);
drop function public.create_itinerary(text,text,text,text,timestamptz,text,timestamptz,uuid,uuid);
drop function public.update_itinerary(uuid,bigint,text,text,text,timestamptz,text,timestamptz,uuid);
drop function public.end_itinerary(uuid,bigint);

create function public.send_room_message(
  requested_room_public_id text, requested_kind text, requested_body text,
  requested_asset_id uuid, requested_reply_to_message_id uuid,
  requested_idempotency_key uuid
) returns table(message_id uuid,created_at timestamptz,revision bigint)
language sql security invoker set search_path=''
as $$select * from security.send_room_message(requested_room_public_id,requested_kind,requested_body,requested_asset_id,requested_reply_to_message_id,requested_idempotency_key);$$;
create function public.recall_room_message(requested_message_id uuid)
returns table(message_id uuid,recalled_at timestamptz,revision bigint)
language sql security invoker set search_path=''
as $$select * from security.recall_room_message(requested_message_id);$$;
create function public.react_to_room_message(requested_message_id uuid,requested_emoji text,requested_active boolean)
returns table(message_id uuid,emoji text,active boolean)
language sql security invoker set search_path=''
as $$select * from security.react_to_room_message(requested_message_id,requested_emoji,requested_active);$$;
create function public.pin_room_message(requested_room_public_id text,requested_message_id uuid)
returns table(room_id uuid,message_id uuid)
language sql security invoker set search_path=''
as $$select * from security.pin_room_message(requested_room_public_id,requested_message_id);$$;
create function public.create_itinerary(
  requested_room_public_id text,requested_title text,requested_description text,
  requested_location_label text,requested_starts_at timestamptz,requested_end_mode text,
  requested_planned_ends_at timestamptz,requested_responsible_actor_id uuid,
  requested_idempotency_key uuid
) returns table(itinerary_id uuid,revision bigint)
language sql security invoker set search_path=''
as $$select * from security.create_itinerary(requested_room_public_id,requested_title,requested_description,requested_location_label,requested_starts_at,requested_end_mode,requested_planned_ends_at,requested_responsible_actor_id,requested_idempotency_key);$$;
create function public.update_itinerary(
  requested_itinerary_id uuid,requested_expected_revision bigint,requested_title text,
  requested_description text,requested_location_label text,requested_starts_at timestamptz,
  requested_end_mode text,requested_planned_ends_at timestamptz,
  requested_responsible_actor_id uuid
) returns table(itinerary_id uuid,revision bigint)
language sql security invoker set search_path=''
as $$select * from security.update_itinerary(requested_itinerary_id,requested_expected_revision,requested_title,requested_description,requested_location_label,requested_starts_at,requested_end_mode,requested_planned_ends_at,requested_responsible_actor_id);$$;
create function public.end_itinerary(requested_itinerary_id uuid,requested_expected_revision bigint)
returns table(itinerary_id uuid,ended_at timestamptz,revision bigint)
language sql security invoker set search_path=''
as $$select * from security.end_itinerary(requested_itinerary_id,requested_expected_revision);$$;

revoke all on function public.send_room_message(text,text,text,uuid,uuid,uuid),public.recall_room_message(uuid),public.react_to_room_message(uuid,text,boolean),public.pin_room_message(text,uuid),public.create_itinerary(text,text,text,text,timestamptz,text,timestamptz,uuid,uuid),public.update_itinerary(uuid,bigint,text,text,text,timestamptz,text,timestamptz,uuid),public.end_itinerary(uuid,bigint) from public,anon,service_role;
grant execute on function public.send_room_message(text,text,text,uuid,uuid,uuid),public.recall_room_message(uuid),public.react_to_room_message(uuid,text,boolean),public.pin_room_message(text,uuid),public.create_itinerary(text,text,text,text,timestamptz,text,timestamptz,uuid,uuid),public.update_itinerary(uuid,bigint,text,text,text,timestamptz,text,timestamptz,uuid),public.end_itinerary(uuid,bigint) to authenticated;
