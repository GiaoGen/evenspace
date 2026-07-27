create function security.list_pending_join_requests(requested_room_public_id text)
returns table (request_id uuid, actor_id uuid, nickname text, note text, requested_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select request.id, request.actor_id, request.nickname, request.note, request.requested_at
  from private.room_join_requests request
  join public.rooms room on room.id = request.room_id
  where room.public_id = requested_room_public_id
    and request.status = 'pending'
    and (select security.is_room_host(room.id))
  order by request.requested_at, request.id;
$$;

create function security.review_join_request(
  requested_room_public_id text, requested_request_id uuid, requested_decision text
)
returns table (outcome text, actor_id uuid, membership_state text)
language plpgsql security definer set search_path = ''
as $$
declare
  selected_room public.rooms%rowtype;
  selected_request private.room_join_requests%rowtype;
  member_count integer;
  now_at timestamptz := statement_timestamp();
begin
  if requested_decision not in ('approved', 'rejected') then
    raise exception using errcode = '22023', message = 'invalid_review_decision';
  end if;
  select room.* into selected_room from public.rooms room
  where room.public_id = requested_room_public_id for update;
  if selected_room.id is null or not (select security.is_room_host(selected_room.id)) then
    raise exception using errcode = '42501', message = 'host_permission_required';
  end if;
  if selected_room.status <> 'active' or selected_room.ends_at <= now_at then
    raise exception using errcode = '55000', message = 'room_not_active';
  end if;
  select request.* into selected_request from private.room_join_requests request
  where request.id = requested_request_id and request.room_id = selected_room.id for update;
  if selected_request.id is null then
    raise exception using errcode = 'P0002', message = 'join_request_not_found';
  end if;
  if selected_request.status <> 'pending' then
    return query select selected_request.status, selected_request.actor_id,
      (select membership.state from public.room_members membership
       where membership.room_id = selected_room.id and membership.actor_id = selected_request.actor_id);
    return;
  end if;
  if requested_decision = 'approved' then
    select count(*) into member_count from public.room_members membership
    where membership.room_id = selected_room.id and membership.state in ('active', 'muted');
    if member_count >= selected_room.member_limit then
      raise exception using errcode = '23514', message = 'room_capacity_reached';
    end if;
    insert into public.room_members (
      room_id, actor_id, nickname, role, state, joined_at, removed_at, archive_eligible
    ) values (
      selected_room.id, selected_request.actor_id, selected_request.nickname,
      'member', 'active', now_at, null, false
    )
    on conflict on constraint room_members_pkey do update set
      nickname = excluded.nickname, role = 'member', state = 'active',
      joined_at = excluded.joined_at, left_at = null, removed_at = null
    where public.room_members.state = 'removed';
  end if;
  update private.room_join_requests request
  set status = requested_decision, decided_at = now_at
  where request.id = selected_request.id;
  return query select requested_decision, selected_request.actor_id,
    case when requested_decision = 'approved' then 'active'::text else null::text end;
end;
$$;

create function security.change_room_member_state(
  requested_room_public_id text, requested_actor_id uuid, requested_state text
)
returns table (actor_id uuid, member_state text)
language plpgsql security definer set search_path = ''
as $$
declare selected_room_id uuid; target_role text;
begin
  if requested_state not in ('active', 'muted', 'removed', 'banned') then
    raise exception using errcode = '22023', message = 'invalid_member_state';
  end if;
  select room.id into selected_room_id from public.rooms room
  where room.public_id = requested_room_public_id and room.status = 'active' for update;
  if selected_room_id is null or not (select security.is_room_host(selected_room_id)) then
    raise exception using errcode = '42501', message = 'host_permission_required';
  end if;
  select membership.role into target_role from public.room_members membership
  where membership.room_id = selected_room_id and membership.actor_id = requested_actor_id for update;
  if target_role is null then raise exception using errcode = 'P0002', message = 'member_not_found'; end if;
  if target_role = 'host' then raise exception using errcode = '42501', message = 'host_state_protected'; end if;
  update public.room_members membership set
    state = requested_state,
    removed_at = case when requested_state in ('removed','banned') then statement_timestamp() else null end,
    left_at = case when requested_state = 'removed' then statement_timestamp() else null end
  where membership.room_id = selected_room_id and membership.actor_id = requested_actor_id;
  return query select requested_actor_id, requested_state;
end;
$$;

create function public.list_pending_join_requests(requested_room_public_id text)
returns table (request_id uuid, actor_id uuid, nickname text, note text, requested_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from security.list_pending_join_requests(requested_room_public_id); $$;
create function public.review_join_request(requested_room_public_id text, requested_request_id uuid, requested_decision text)
returns table (outcome text, actor_id uuid, membership_state text)
language sql security invoker set search_path = ''
as $$ select * from security.review_join_request(requested_room_public_id, requested_request_id, requested_decision); $$;
create function public.change_room_member_state(requested_room_public_id text, requested_actor_id uuid, requested_state text)
returns table (actor_id uuid, member_state text)
language sql security invoker set search_path = ''
as $$ select * from security.change_room_member_state(requested_room_public_id, requested_actor_id, requested_state); $$;

revoke all on function security.list_pending_join_requests(text), security.review_join_request(text,uuid,text), security.change_room_member_state(text,uuid,text) from public, anon, service_role;
grant execute on function security.list_pending_join_requests(text), security.review_join_request(text,uuid,text), security.change_room_member_state(text,uuid,text) to authenticated;
revoke all on function public.list_pending_join_requests(text), public.review_join_request(text,uuid,text), public.change_room_member_state(text,uuid,text) from public, anon, service_role;
grant execute on function public.list_pending_join_requests(text), public.review_join_request(text,uuid,text), public.change_room_member_state(text,uuid,text) to authenticated;

insert into private.schema_versions(component,version) values ('member_governance',1)
on conflict(component) do update set version=excluded.version, applied_at=now();
