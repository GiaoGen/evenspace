create table public.itineraries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  title text not null, description text not null default '', location_label text,
  starts_at timestamptz not null, end_mode text not null,
  planned_ends_at timestamptz, ended_at timestamptz,
  responsible_actor_id uuid references public.actors(id) on delete restrict,
  created_by_actor_id uuid not null references public.actors(id) on delete restrict,
  revision bigint not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint itineraries_title_valid check(title=btrim(title) and char_length(title) between 1 and 120),
  constraint itineraries_description_valid check(char_length(description)<=1000),
  constraint itineraries_location_valid check(location_label is null or (location_label=btrim(location_label) and char_length(location_label) between 1 and 160)),
  constraint itineraries_end_mode_valid check(end_mode in('scheduled','manual')),
  constraint itineraries_time_valid check(
    (end_mode='scheduled' and planned_ends_at is not null and planned_ends_at>starts_at)
    or (end_mode='manual' and planned_ends_at is null)
  ),
  constraint itineraries_ended_valid check(ended_at is null or ended_at>=starts_at),
  constraint itineraries_revision_positive check(revision>0)
);
create index itineraries_room_starts_id_idx on public.itineraries(room_id,starts_at,id);
create index itineraries_responsible_actor_id_idx on public.itineraries(responsible_actor_id) where responsible_actor_id is not null;
create index itineraries_created_by_actor_id_idx on public.itineraries(created_by_actor_id);
create trigger itineraries_set_updated_at before update on public.itineraries for each row execute function private.set_updated_at();
alter table public.itineraries enable row level security; alter table public.itineraries force row level security;
revoke all on public.itineraries from public,anon;
grant select on public.itineraries to authenticated;
create policy itineraries_member_read on public.itineraries for select to authenticated using((select security.can_read_room(room_id)));

create function security.create_itinerary(
  requested_room_public_id text,requested_title text,requested_description text,requested_location_label text,
  requested_starts_at timestamptz,requested_end_mode text,requested_planned_ends_at timestamptz,
  requested_responsible_actor_id uuid,requested_idempotency_key uuid
) returns table(itinerary_id uuid,revision bigint)
language plpgsql security definer set search_path='' as $$
declare selected_room public.rooms%rowtype; caller_actor_id uuid; previous public.itineraries%rowtype; inserted public.itineraries%rowtype;
begin
 select room.* into selected_room from public.rooms room
 where room.public_id=requested_room_public_id and room.status='active' and room.ends_at>statement_timestamp()
   and exists(select 1 from public.room_members membership join public.actors actor on actor.id=membership.actor_id
     where membership.room_id=room.id and membership.state='active' and actor.owner_user_id=(select auth.uid()))
 limit 1;
 select membership.actor_id into caller_actor_id from public.room_members membership
 join public.actors actor on actor.id=membership.actor_id
 where membership.room_id=selected_room.id and membership.state='active'
   and actor.owner_user_id=(select auth.uid()) limit 1;
 if caller_actor_id is null then raise exception using errcode='42501',message='active_membership_required'; end if;
 select itinerary.* into previous from public.itineraries itinerary where itinerary.created_by_actor_id=caller_actor_id and itinerary.id=requested_idempotency_key;
 if previous.id is not null then return query select previous.id,previous.revision; return; end if;
 if requested_responsible_actor_id is not null and not exists(select 1 from public.room_members membership where membership.room_id=selected_room.id and membership.actor_id=requested_responsible_actor_id and membership.state in('active','muted')) then raise exception using errcode='22023',message='responsible_member_required'; end if;
 insert into public.itineraries(id,room_id,title,description,location_label,starts_at,end_mode,planned_ends_at,responsible_actor_id,created_by_actor_id)
 values(requested_idempotency_key,selected_room.id,btrim(requested_title),btrim(requested_description),nullif(btrim(requested_location_label),''),requested_starts_at,requested_end_mode,requested_planned_ends_at,requested_responsible_actor_id,caller_actor_id)
 returning * into inserted;
 return query select inserted.id,inserted.revision;
end; $$;

create function security.update_itinerary(
 requested_itinerary_id uuid,requested_expected_revision bigint,requested_title text,requested_description text,
 requested_location_label text,requested_starts_at timestamptz,requested_end_mode text,
 requested_planned_ends_at timestamptz,requested_responsible_actor_id uuid
) returns table(itinerary_id uuid,revision bigint)
language plpgsql security definer set search_path='' as $$
declare selected public.itineraries%rowtype;
begin
 select itinerary.* into selected from public.itineraries itinerary where itinerary.id=requested_itinerary_id for update;
 if selected.id is null or not (select security.can_read_room(selected.room_id)) then raise exception using errcode='42501',message='membership_required'; end if;
 if selected.revision<>requested_expected_revision then raise exception using errcode='40001',message='revision_conflict'; end if;
 if selected.ended_at is not null then raise exception using errcode='55000',message='itinerary_already_ended'; end if;
 if requested_responsible_actor_id is not null and not exists(select 1 from public.room_members membership where membership.room_id=selected.room_id and membership.actor_id=requested_responsible_actor_id and membership.state in('active','muted')) then raise exception using errcode='22023',message='responsible_member_required'; end if;
 update public.itineraries itinerary set title=btrim(requested_title),description=btrim(requested_description),location_label=nullif(btrim(requested_location_label),''),
   starts_at=requested_starts_at,end_mode=requested_end_mode,planned_ends_at=requested_planned_ends_at,responsible_actor_id=requested_responsible_actor_id,revision=itinerary.revision+1
 where itinerary.id=selected.id returning itinerary.id,itinerary.revision into itinerary_id,revision;
 return next;
end; $$;

create function security.end_itinerary(requested_itinerary_id uuid,requested_expected_revision bigint)
returns table(itinerary_id uuid,ended_at timestamptz,revision bigint)
language plpgsql security definer set search_path='' as $$
declare selected public.itineraries%rowtype; now_at timestamptz:=statement_timestamp();
begin
 select itinerary.* into selected from public.itineraries itinerary where itinerary.id=requested_itinerary_id for update;
 if selected.id is null or not (select security.can_read_room(selected.room_id)) then raise exception using errcode='42501',message='membership_required'; end if;
 if selected.revision<>requested_expected_revision then raise exception using errcode='40001',message='revision_conflict'; end if;
 update public.itineraries itinerary set ended_at=coalesce(itinerary.ended_at,now_at),revision=itinerary.revision+case when itinerary.ended_at is null then 1 else 0 end
 where itinerary.id=selected.id returning itinerary.id,itinerary.ended_at,itinerary.revision into itinerary_id,ended_at,revision;
 return next;
end; $$;

create function public.create_itinerary(text,text,text,text,timestamptz,text,timestamptz,uuid,uuid) returns table(itinerary_id uuid,revision bigint) language sql security invoker set search_path='' as $$select * from security.create_itinerary($1,$2,$3,$4,$5,$6,$7,$8,$9);$$;
create function public.update_itinerary(uuid,bigint,text,text,text,timestamptz,text,timestamptz,uuid) returns table(itinerary_id uuid,revision bigint) language sql security invoker set search_path='' as $$select * from security.update_itinerary($1,$2,$3,$4,$5,$6,$7,$8,$9);$$;
create function public.end_itinerary(uuid,bigint) returns table(itinerary_id uuid,ended_at timestamptz,revision bigint) language sql security invoker set search_path='' as $$select * from security.end_itinerary($1,$2);$$;
revoke all on function security.create_itinerary(text,text,text,text,timestamptz,text,timestamptz,uuid,uuid),security.update_itinerary(uuid,bigint,text,text,text,timestamptz,text,timestamptz,uuid),security.end_itinerary(uuid,bigint) from public,anon,service_role;
grant execute on function security.create_itinerary(text,text,text,text,timestamptz,text,timestamptz,uuid,uuid),security.update_itinerary(uuid,bigint,text,text,text,timestamptz,text,timestamptz,uuid),security.end_itinerary(uuid,bigint) to authenticated;
revoke all on function public.create_itinerary(text,text,text,text,timestamptz,text,timestamptz,uuid,uuid),public.update_itinerary(uuid,bigint,text,text,text,timestamptz,text,timestamptz,uuid),public.end_itinerary(uuid,bigint) from public,anon,service_role;
grant execute on function public.create_itinerary(text,text,text,text,timestamptz,text,timestamptz,uuid,uuid),public.update_itinerary(uuid,bigint,text,text,text,timestamptz,text,timestamptz,uuid),public.end_itinerary(uuid,bigint) to authenticated;
create trigger itineraries_private_event after insert or update or delete on public.itineraries for each row execute function private.broadcast_room_event();
insert into private.schema_versions(component,version) values('itinerary_backend',1) on conflict(component) do update set version=excluded.version,applied_at=now();
