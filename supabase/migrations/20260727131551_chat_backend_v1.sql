create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_actor_id uuid not null references public.actors(id) on delete restrict,
  kind text not null, status text not null default 'pending',
  object_key text, mime_type text, byte_size bigint, duration_ms integer,
  created_at timestamptz not null default now(), ready_at timestamptz,
  constraint assets_kind_valid check(kind in ('voice','image')),
  constraint assets_status_valid check(status in ('pending','ready','failed','deleted')),
  constraint assets_object_key_valid check(object_key is null or (object_key=btrim(object_key) and char_length(object_key) between 1 and 500)),
  constraint assets_size_valid check(byte_size is null or byte_size between 1 and 26214400),
  constraint assets_voice_duration_valid check(kind<>'voice' or duration_ms is null or duration_ms between 1 and 60000),
  constraint assets_ready_fields check(status<>'ready' or (object_key is not null and mime_type is not null and byte_size is not null and ready_at is not null))
);
create index assets_owner_actor_id_created_at_idx on public.assets(owner_actor_id,created_at desc,id desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_actor_id uuid not null references public.actors(id) on delete restrict,
  kind text not null, body text, asset_id uuid references public.assets(id) on delete restrict,
  reply_to_message_id uuid references public.messages(id) on delete set null,
  client_command_id uuid not null,
  revision bigint not null default 1,
  created_at timestamptz not null default now(), recalled_at timestamptz,
  moderated_at timestamptz, moderated_by_actor_id uuid references public.actors(id) on delete restrict,
  constraint messages_kind_valid check(kind in ('text','voice','system')),
  constraint messages_content_valid check(
    (kind='text' and body is not null and btrim(body)<>'' and char_length(body)<=4000 and asset_id is null)
    or (kind='voice' and asset_id is not null and body is null)
    or (kind='system' and body is not null and asset_id is null)
  ),
  constraint messages_revision_positive check(revision>0),
  constraint messages_author_command_unique unique(author_actor_id,client_command_id)
);
create index messages_room_created_id_idx on public.messages(room_id,created_at desc,id desc);
create index messages_reply_to_idx on public.messages(reply_to_message_id) where reply_to_message_id is not null;
create index messages_asset_id_idx on public.messages(asset_id) where asset_id is not null;
create index messages_moderated_by_idx on public.messages(moderated_by_actor_id) where moderated_by_actor_id is not null;

create table public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  actor_id uuid not null references public.actors(id) on delete restrict,
  emoji text not null, created_at timestamptz not null default now(),
  primary key(message_id,actor_id,emoji),
  constraint message_reactions_emoji_valid check(char_length(emoji) between 1 and 16)
);
create index message_reactions_actor_id_idx on public.message_reactions(actor_id);

create table public.message_pins (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  message_id uuid not null unique references public.messages(id) on delete cascade,
  pinned_by_actor_id uuid not null references public.actors(id) on delete restrict,
  pinned_at timestamptz not null default now()
);
create index message_pins_pinned_by_actor_id_idx on public.message_pins(pinned_by_actor_id);

alter table public.assets enable row level security; alter table public.assets force row level security;
alter table public.messages enable row level security; alter table public.messages force row level security;
alter table public.message_reactions enable row level security; alter table public.message_reactions force row level security;
alter table public.message_pins enable row level security; alter table public.message_pins force row level security;
revoke all on public.assets,public.messages,public.message_reactions,public.message_pins from public,anon;
grant select on public.assets,public.messages,public.message_reactions,public.message_pins to authenticated;
create policy assets_member_read on public.assets for select to authenticated using(
  exists(select 1 from public.messages message where message.asset_id=assets.id and (select security.can_read_room(message.room_id)))
  or exists(select 1 from public.actors actor where actor.id=assets.owner_actor_id and actor.owner_user_id=(select auth.uid()))
);
create policy messages_member_read on public.messages for select to authenticated using((select security.can_read_room(room_id)));
create policy reactions_member_read on public.message_reactions for select to authenticated using(exists(select 1 from public.messages message where message.id=message_id and (select security.can_read_room(message.room_id))));
create policy pins_member_read on public.message_pins for select to authenticated using((select security.can_read_room(room_id)));

create function security.send_room_message(
  requested_room_public_id text,requested_kind text,requested_body text,
  requested_asset_id uuid,requested_reply_to_message_id uuid,requested_idempotency_key uuid
) returns table(message_id uuid,created_at timestamptz,revision bigint)
language plpgsql security definer set search_path=''
as $$
declare caller_actor_id uuid; selected_room_id uuid; existing public.messages%rowtype; inserted public.messages%rowtype;
begin
  select room.id,membership.actor_id into selected_room_id,caller_actor_id
  from public.rooms room join public.room_members membership on membership.room_id=room.id
  join public.actors actor on actor.id=membership.actor_id
  where room.public_id=requested_room_public_id and room.status='active' and room.ends_at>statement_timestamp()
    and actor.owner_user_id=(select auth.uid()) and membership.state='active' limit 1;
  if caller_actor_id is null then raise exception using errcode='42501',message='active_membership_required'; end if;
  if requested_kind not in ('text','voice') or requested_idempotency_key is null then raise exception using errcode='22023',message='invalid_message_input'; end if;
  select message.* into existing from public.messages message where message.author_actor_id=caller_actor_id and message.client_command_id=requested_idempotency_key;
  if existing.id is not null then return query select existing.id,existing.created_at,existing.revision; return; end if;
  if requested_reply_to_message_id is not null and not exists(select 1 from public.messages reply where reply.id=requested_reply_to_message_id and reply.room_id=selected_room_id) then raise exception using errcode='22023',message='invalid_reply'; end if;
  if requested_kind='voice' and not exists(select 1 from public.assets asset where asset.id=requested_asset_id and asset.owner_actor_id=caller_actor_id and asset.kind='voice' and asset.status='ready') then raise exception using errcode='22023',message='voice_asset_not_ready'; end if;
  insert into public.messages(room_id,author_actor_id,kind,body,asset_id,reply_to_message_id,client_command_id)
  values(selected_room_id,caller_actor_id,requested_kind,case when requested_kind='text' then btrim(requested_body) end,case when requested_kind='voice' then requested_asset_id end,requested_reply_to_message_id,requested_idempotency_key)
  returning * into inserted;
  return query select inserted.id,inserted.created_at,inserted.revision;
end; $$;

create function security.recall_room_message(requested_message_id uuid)
returns table(message_id uuid,recalled_at timestamptz,revision bigint)
language plpgsql security definer set search_path='' as $$
declare caller_actor_id uuid; changed public.messages%rowtype;
begin
 select actor.id into caller_actor_id from public.actors actor where actor.owner_user_id=(select auth.uid()) and actor.is_primary limit 1;
 update public.messages message set recalled_at=coalesce(message.recalled_at,statement_timestamp()),revision=message.revision+case when message.recalled_at is null then 1 else 0 end
 where message.id=requested_message_id and message.author_actor_id=caller_actor_id returning * into changed;
 if changed.id is null then raise exception using errcode='42501',message='message_author_required'; end if;
 return query select changed.id,changed.recalled_at,changed.revision;
end; $$;

create function security.react_to_room_message(requested_message_id uuid,requested_emoji text,requested_active boolean)
returns table(message_id uuid,emoji text,active boolean)
language plpgsql security definer set search_path='' as $$
declare caller_actor_id uuid; selected_room_id uuid;
begin
 select message.room_id into selected_room_id from public.messages message where message.id=requested_message_id;
 select membership.actor_id into caller_actor_id from public.room_members membership join public.actors actor on actor.id=membership.actor_id
 where membership.room_id=selected_room_id and membership.state='active' and actor.owner_user_id=(select auth.uid()) limit 1;
 if caller_actor_id is null or char_length(requested_emoji) not between 1 and 16 then raise exception using errcode='42501',message='active_membership_required'; end if;
 if requested_active then insert into public.message_reactions(message_id,actor_id,emoji) values(requested_message_id,caller_actor_id,requested_emoji) on conflict do nothing;
 else delete from public.message_reactions where message_id=requested_message_id and actor_id=caller_actor_id and emoji=requested_emoji; end if;
 return query select requested_message_id,requested_emoji,requested_active;
end; $$;

create function security.pin_room_message(requested_room_public_id text,requested_message_id uuid)
returns table(room_id uuid,message_id uuid)
language plpgsql security definer set search_path='' as $$
declare selected_room_id uuid; caller_actor_id uuid;
begin
 select room.id,membership.actor_id into selected_room_id,caller_actor_id from public.rooms room join public.room_members membership on membership.room_id=room.id join public.actors actor on actor.id=membership.actor_id
 where room.public_id=requested_room_public_id and membership.role='host' and membership.state in('active','muted') and actor.owner_user_id=(select auth.uid()) limit 1;
 if selected_room_id is null or not exists(select 1 from public.messages message where message.id=requested_message_id and message.room_id=selected_room_id) then raise exception using errcode='42501',message='host_permission_required'; end if;
 insert into public.message_pins(room_id,message_id,pinned_by_actor_id) values(selected_room_id,requested_message_id,caller_actor_id)
 on conflict on constraint message_pins_pkey do update set message_id=excluded.message_id,pinned_by_actor_id=excluded.pinned_by_actor_id,pinned_at=statement_timestamp();
 return query select selected_room_id,requested_message_id;
end; $$;

create function public.send_room_message(text,text,text,uuid,uuid,uuid) returns table(message_id uuid,created_at timestamptz,revision bigint) language sql security invoker set search_path='' as $$select * from security.send_room_message($1,$2,$3,$4,$5,$6);$$;
create function public.recall_room_message(uuid) returns table(message_id uuid,recalled_at timestamptz,revision bigint) language sql security invoker set search_path='' as $$select * from security.recall_room_message($1);$$;
create function public.react_to_room_message(uuid,text,boolean) returns table(message_id uuid,emoji text,active boolean) language sql security invoker set search_path='' as $$select * from security.react_to_room_message($1,$2,$3);$$;
create function public.pin_room_message(text,uuid) returns table(room_id uuid,message_id uuid) language sql security invoker set search_path='' as $$select * from security.pin_room_message($1,$2);$$;
revoke all on function security.send_room_message(text,text,text,uuid,uuid,uuid),security.recall_room_message(uuid),security.react_to_room_message(uuid,text,boolean),security.pin_room_message(text,uuid) from public,anon,service_role;
grant execute on function security.send_room_message(text,text,text,uuid,uuid,uuid),security.recall_room_message(uuid),security.react_to_room_message(uuid,text,boolean),security.pin_room_message(text,uuid) to authenticated;
revoke all on function public.send_room_message(text,text,text,uuid,uuid,uuid),public.recall_room_message(uuid),public.react_to_room_message(uuid,text,boolean),public.pin_room_message(text,uuid) from public,anon,service_role;
grant execute on function public.send_room_message(text,text,text,uuid,uuid,uuid),public.recall_room_message(uuid),public.react_to_room_message(uuid,text,boolean),public.pin_room_message(text,uuid) to authenticated;
create trigger messages_private_event after insert or update on public.messages for each row execute function private.broadcast_room_event();
create trigger reactions_private_event after insert or delete on public.message_reactions for each row execute function private.broadcast_room_event();
create trigger pins_private_event after insert or update or delete on public.message_pins for each row execute function private.broadcast_room_event();
insert into private.schema_versions(component,version) values('chat_backend',1) on conflict(component) do update set version=excluded.version,applied_at=now();
