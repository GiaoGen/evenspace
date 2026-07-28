create table public.photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  asset_id uuid not null unique references public.assets(id) on delete restrict,
  owner_actor_id uuid not null references public.actors(id) on delete restrict,
  original_name text not null,
  aspect_ratio double precision not null,
  note text,
  created_at timestamptz not null default now(),
  constraint photos_original_name_valid check(char_length(original_name) between 1 and 120),
  constraint photos_aspect_ratio_valid check(aspect_ratio between 0.1 and 10),
  constraint photos_note_valid check(note is null or char_length(note) <= 1000)
);
create index photos_room_created_at_idx on public.photos(room_id,created_at,id);

create table public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  actor_id uuid not null references public.actors(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  constraint photo_comments_body_valid check(char_length(btrim(body)) between 1 and 1000)
);
create index photo_comments_photo_created_at_idx on public.photo_comments(photo_id,created_at,id);

alter table public.photos enable row level security;
alter table public.photos force row level security;
alter table public.photo_comments enable row level security;
alter table public.photo_comments force row level security;
revoke all on public.photos, public.photo_comments from public, anon;
grant select on public.photos, public.photo_comments to authenticated;
grant all privileges on public.photos, public.photo_comments to service_role;

create policy photos_member_read on public.photos for select to authenticated
using ((select security.can_read_room(room_id)));
create policy photo_comments_member_read on public.photo_comments for select to authenticated
using ((select security.can_read_room(room_id)));

drop policy assets_member_read on public.assets;
create policy assets_member_read on public.assets for select to authenticated using(
  exists(select 1 from public.messages message where message.asset_id=assets.id and (select security.can_read_room(message.room_id)))
  or exists(select 1 from public.photos photo where photo.asset_id=assets.id and (select security.can_read_room(photo.room_id)))
  or exists(select 1 from public.actors actor where actor.id=assets.owner_actor_id and actor.owner_user_id=(select auth.uid()))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'room-media','room-media',false,10485760,
  array['image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/mp4']
)
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create function security.prepare_room_media_upload(
  requested_room_public_id text,
  requested_kind text,
  requested_mime_type text,
  requested_byte_size bigint,
  requested_duration_ms integer default null
) returns table(asset_id uuid,object_key text)
language plpgsql security definer set search_path=''
as $$
declare selected_room_id uuid; caller_actor_id uuid; new_asset_id uuid; new_object_key text;
begin
  select room.id,membership.actor_id into selected_room_id,caller_actor_id
  from public.rooms room
  join public.room_members membership on membership.room_id=room.id
  join public.actors actor on actor.id=membership.actor_id
  where room.public_id=requested_room_public_id
    and room.status='active' and room.ends_at>statement_timestamp()
    and membership.state='active'
    and actor.owner_user_id=(select auth.uid()) and actor.kind<>'deleted'
  limit 1;
  if caller_actor_id is null then raise exception using errcode='42501',message='active_membership_required'; end if;
  if requested_kind='image' then
    if requested_mime_type not in ('image/jpeg','image/png','image/webp') or requested_byte_size not between 1 and 10485760 then
      raise exception using errcode='22023',message='invalid_image_upload';
    end if;
    if (select count(*) from public.photos where room_id=selected_room_id) >= 25 then
      raise exception using errcode='22023',message='photo_limit_reached';
    end if;
  elsif requested_kind='voice' then
    if requested_mime_type not in ('audio/webm','audio/ogg','audio/mp4') or requested_byte_size not between 1 and 1048576 or requested_duration_ms not between 1 and 60000 then
      raise exception using errcode='22023',message='invalid_voice_upload';
    end if;
  else raise exception using errcode='22023',message='invalid_asset_kind'; end if;
  new_asset_id:=gen_random_uuid();
  new_object_key:='rooms/'||selected_room_id::text||'/'||caller_actor_id::text||'/'||new_asset_id::text;
  insert into public.assets(id,owner_actor_id,kind,status,object_key,mime_type,byte_size,duration_ms)
  values(new_asset_id,caller_actor_id,requested_kind,'pending',new_object_key,requested_mime_type,requested_byte_size,requested_duration_ms);
  return query select new_asset_id,new_object_key;
end; $$;

create function security.finalize_room_media_upload(requested_asset_id uuid)
returns table(asset_id uuid,object_key text,kind text,mime_type text,byte_size bigint,duration_ms integer)
language plpgsql security definer set search_path=''
as $$
declare selected public.assets%rowtype;
begin
  select asset.* into selected from public.assets asset join public.actors actor on actor.id=asset.owner_actor_id
  where asset.id=requested_asset_id and actor.owner_user_id=(select auth.uid()) and actor.kind<>'deleted'
  for update;
  if selected.id is null then raise exception using errcode='42501',message='asset_owner_required'; end if;
  if selected.status='ready' then return query select selected.id,selected.object_key,selected.kind,selected.mime_type,selected.byte_size,selected.duration_ms; return; end if;
  if selected.status<>'pending' or not exists(select 1 from storage.objects object where object.bucket_id='room-media' and object.name=selected.object_key) then
    raise exception using errcode='22023',message='media_upload_not_found';
  end if;
  update public.assets set status='ready',ready_at=statement_timestamp() where id=selected.id returning * into selected;
  return query select selected.id,selected.object_key,selected.kind,selected.mime_type,selected.byte_size,selected.duration_ms;
end; $$;

create function security.create_room_photo(
  requested_room_public_id text,
  requested_asset_id uuid,
  requested_original_name text,
  requested_aspect_ratio double precision
) returns table(photo_id uuid,created_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare selected_room_id uuid; caller_actor_id uuid; inserted public.photos%rowtype;
begin
  select room.id,membership.actor_id into selected_room_id,caller_actor_id from public.rooms room
  join public.room_members membership on membership.room_id=room.id join public.actors actor on actor.id=membership.actor_id
  where room.public_id=requested_room_public_id and room.status='active' and room.ends_at>statement_timestamp()
    and membership.state='active' and actor.owner_user_id=(select auth.uid()) and actor.kind<>'deleted' limit 1;
  if caller_actor_id is null then raise exception using errcode='42501',message='active_membership_required'; end if;
  if btrim(requested_original_name)='' or char_length(requested_original_name)>120 or requested_aspect_ratio not between 0.1 and 10 then raise exception using errcode='22023',message='invalid_photo_input'; end if;
  if (select count(*) from public.photos where room_id=selected_room_id) >= 25 then raise exception using errcode='22023',message='photo_limit_reached'; end if;
  insert into public.photos(room_id,asset_id,owner_actor_id,original_name,aspect_ratio)
  select selected_room_id,asset.id,caller_actor_id,btrim(requested_original_name),requested_aspect_ratio from public.assets asset
  where asset.id=requested_asset_id and asset.owner_actor_id=caller_actor_id and asset.kind='image' and asset.status='ready'
  returning * into inserted;
  if inserted.id is null then raise exception using errcode='22023',message='image_asset_not_ready'; end if;
  return query select inserted.id,inserted.created_at;
end; $$;

create function security.add_photo_comment(requested_photo_id uuid,requested_body text)
returns table(comment_id uuid,created_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare selected_room_id uuid; caller_actor_id uuid; inserted public.photo_comments%rowtype;
begin
  select photo.room_id,membership.actor_id into selected_room_id,caller_actor_id from public.photos photo
  join public.room_members membership on membership.room_id=photo.room_id join public.actors actor on actor.id=membership.actor_id
  join public.rooms room on room.id=photo.room_id
  where photo.id=requested_photo_id and room.status='active' and room.ends_at>statement_timestamp()
    and membership.state='active' and actor.owner_user_id=(select auth.uid()) and actor.kind<>'deleted' limit 1;
  if caller_actor_id is null or char_length(btrim(requested_body)) not between 1 and 1000 then raise exception using errcode='22023',message='invalid_photo_comment'; end if;
  insert into public.photo_comments(room_id,photo_id,actor_id,body) values(selected_room_id,requested_photo_id,caller_actor_id,btrim(requested_body)) returning * into inserted;
  return query select inserted.id,inserted.created_at;
end; $$;

create function security.delete_room_photo(requested_photo_id uuid)
returns table(photo_id uuid,asset_id uuid,object_key text)
language plpgsql security definer set search_path=''
as $$
declare target public.photos%rowtype; caller_actor_id uuid; caller_is_host boolean; target_asset public.assets%rowtype;
begin
  select photo.* into target from public.photos photo where photo.id=requested_photo_id for update;
  if target.id is null then raise exception using errcode='22023',message='photo_not_found'; end if;
  select membership.actor_id,(membership.role='host') into caller_actor_id,caller_is_host from public.room_members membership
  join public.actors actor on actor.id=membership.actor_id join public.rooms room on room.id=membership.room_id
  where membership.room_id=target.room_id and membership.state='active' and room.status='active' and room.ends_at>statement_timestamp()
    and actor.owner_user_id=(select auth.uid()) and actor.kind<>'deleted' limit 1;
  if caller_actor_id is null or (caller_actor_id<>target.owner_actor_id and not caller_is_host) then raise exception using errcode='42501',message='photo_delete_forbidden'; end if;
  select asset.* into target_asset from public.assets asset where asset.id=target.asset_id for update;
  delete from public.photos where id=target.id;
  update public.assets set status='deleted' where id=target_asset.id;
  return query select target.id,target_asset.id,target_asset.object_key;
end; $$;

create function public.prepare_room_media_upload(text,text,text,bigint,integer default null)
returns table(asset_id uuid,object_key text) language sql security invoker set search_path=''
as $$select * from security.prepare_room_media_upload($1,$2,$3,$4,$5);$$;
create function public.finalize_room_media_upload(uuid)
returns table(asset_id uuid,object_key text,kind text,mime_type text,byte_size bigint,duration_ms integer) language sql security invoker set search_path=''
as $$select * from security.finalize_room_media_upload($1);$$;
create function public.create_room_photo(text,uuid,text,double precision)
returns table(photo_id uuid,created_at timestamptz) language sql security invoker set search_path=''
as $$select * from security.create_room_photo($1,$2,$3,$4);$$;
create function public.add_photo_comment(uuid,text)
returns table(comment_id uuid,created_at timestamptz) language sql security invoker set search_path=''
as $$select * from security.add_photo_comment($1,$2);$$;
create function public.delete_room_photo(uuid)
returns table(photo_id uuid,asset_id uuid,object_key text) language sql security invoker set search_path=''
as $$select * from security.delete_room_photo($1);$$;

revoke all on function security.prepare_room_media_upload(text,text,text,bigint,integer),security.finalize_room_media_upload(uuid),security.create_room_photo(text,uuid,text,double precision),security.add_photo_comment(uuid,text),security.delete_room_photo(uuid) from public,anon,service_role;
grant execute on function security.prepare_room_media_upload(text,text,text,bigint,integer),security.finalize_room_media_upload(uuid),security.create_room_photo(text,uuid,text,double precision),security.add_photo_comment(uuid,text),security.delete_room_photo(uuid) to authenticated;
revoke all on function public.prepare_room_media_upload(text,text,text,bigint,integer),public.finalize_room_media_upload(uuid),public.create_room_photo(text,uuid,text,double precision),public.add_photo_comment(uuid,text),public.delete_room_photo(uuid) from public,anon,service_role;
grant execute on function public.prepare_room_media_upload(text,text,text,bigint,integer),public.finalize_room_media_upload(uuid),public.create_room_photo(text,uuid,text,double precision),public.add_photo_comment(uuid,text),public.delete_room_photo(uuid) to authenticated;

create policy room_media_insert on storage.objects for insert to authenticated with check(
  bucket_id='room-media' and exists(
    select 1 from public.assets asset join public.actors actor on actor.id=asset.owner_actor_id
    where asset.object_key=name and asset.status='pending' and actor.owner_user_id=(select auth.uid())
  )
);
create policy room_media_select on storage.objects for select to authenticated using(
  bucket_id='room-media' and exists(
    select 1 from public.assets asset
    where asset.object_key=name and (
      exists(select 1 from public.actors actor where actor.id=asset.owner_actor_id and actor.owner_user_id=(select auth.uid()))
      or exists(select 1 from public.messages message where message.asset_id=asset.id and (select security.can_read_room(message.room_id)))
      or exists(select 1 from public.photos photo where photo.asset_id=asset.id and (select security.can_read_room(photo.room_id)))
    )
  )
);
create policy room_media_delete on storage.objects for delete to authenticated using(
  bucket_id='room-media' and exists(
    select 1 from public.photos photo join public.room_members membership on membership.room_id=photo.room_id join public.actors actor on actor.id=membership.actor_id
    join public.assets asset on asset.id=photo.asset_id
    where asset.object_key=name and actor.owner_user_id=(select auth.uid()) and membership.state='active'
      and (membership.actor_id=photo.owner_actor_id or membership.role='host')
  )
);

create trigger photos_private_event after insert or update or delete on public.photos for each row execute function private.broadcast_room_event();
create trigger photo_comments_private_event after insert or update or delete on public.photo_comments for each row execute function private.broadcast_room_event();

insert into private.schema_versions(component,version) values('room_media_photos',1)
on conflict(component) do update set version=excluded.version,applied_at=now();
