alter table public.assets
  add column thumbnail_object_key text,
  add column thumbnail_byte_size bigint,
  add column placeholder_data_url text,
  add column image_width integer,
  add column image_height integer,
  add column media_revision integer not null default 1,
  add constraint assets_thumbnail_pair_valid check(
    (thumbnail_object_key is null and thumbnail_byte_size is null)
    or (
      thumbnail_object_key = btrim(thumbnail_object_key)
      and char_length(thumbnail_object_key) between 1 and 500
      and thumbnail_byte_size between 1 and 184320
    )
  ),
  add constraint assets_placeholder_data_url_valid check(
    placeholder_data_url is null
    or (
      placeholder_data_url like 'data:image/jpeg;base64,%'
      and char_length(placeholder_data_url) between 32 and 10000
    )
  ),
  add constraint assets_image_dimensions_valid check(
    (image_width is null and image_height is null)
    or (image_width between 1 and 1600 and image_height between 1 and 1600)
  ),
  add constraint assets_media_revision_valid check(media_revision >= 1);

create function security.prepare_room_media_upload_v2(
  requested_room_public_id text,
  requested_display_byte_size bigint,
  requested_thumbnail_byte_size bigint,
  requested_placeholder_data_url text,
  requested_image_width integer,
  requested_image_height integer
) returns table(asset_id uuid, object_key text, thumbnail_object_key text)
language plpgsql security definer set search_path=''
as $$
declare selected_room_id uuid; caller_actor_id uuid; new_asset_id uuid; new_object_key text; new_thumbnail_object_key text;
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
  if requested_display_byte_size not between 1 and 2250000
    or requested_thumbnail_byte_size not between 1 and 184320
    or requested_placeholder_data_url not like 'data:image/jpeg;base64,%'
    or char_length(requested_placeholder_data_url) not between 32 and 10000
    or requested_image_width not between 1 and 1600
    or requested_image_height not between 1 and 1600 then
    raise exception using errcode='22023',message='invalid_image_upload';
  end if;
  if (select count(*) from public.photos where room_id=selected_room_id) >= 25 then
    raise exception using errcode='22023',message='photo_limit_reached';
  end if;
  new_asset_id:=gen_random_uuid();
  new_object_key:='rooms/'||selected_room_id::text||'/'||caller_actor_id::text||'/'||new_asset_id::text||'/display.jpg';
  new_thumbnail_object_key:='rooms/'||selected_room_id::text||'/'||caller_actor_id::text||'/'||new_asset_id::text||'/thumbnail.jpg';
  insert into public.assets(id,owner_actor_id,kind,status,object_key,mime_type,byte_size,thumbnail_object_key,thumbnail_byte_size,placeholder_data_url,image_width,image_height)
  values(new_asset_id,caller_actor_id,'image','pending',new_object_key,'image/jpeg',requested_display_byte_size,new_thumbnail_object_key,requested_thumbnail_byte_size,requested_placeholder_data_url,requested_image_width,requested_image_height);
  return query select new_asset_id,new_object_key,new_thumbnail_object_key;
end; $$;

create function security.finalize_room_media_upload_v2(requested_asset_id uuid)
returns table(asset_id uuid,object_key text,thumbnail_object_key text,mime_type text,byte_size bigint,thumbnail_byte_size bigint,placeholder_data_url text)
language plpgsql security definer set search_path=''
as $$
declare selected public.assets%rowtype;
begin
  select asset.* into selected from public.assets asset
  join public.actors actor on actor.id=asset.owner_actor_id
  where asset.id=requested_asset_id and actor.owner_user_id=(select auth.uid()) and actor.kind<>'deleted'
  for update;
  if selected.id is null then raise exception using errcode='42501',message='asset_owner_required'; end if;
  if selected.kind<>'image' then raise exception using errcode='22023',message='invalid_image_upload'; end if;
  if selected.status='ready' then
    return query select selected.id,selected.object_key,selected.thumbnail_object_key,selected.mime_type,selected.byte_size,selected.thumbnail_byte_size,selected.placeholder_data_url;
    return;
  end if;
  if selected.status<>'pending'
    or selected.thumbnail_object_key is null
    or not exists(
      select 1 from storage.objects object
      where object.bucket_id='room-media' and object.name=selected.object_key
        and object.metadata->>'mimetype'='image/jpeg'
        and coalesce(nullif(object.metadata->>'size','')::bigint,-1)=selected.byte_size
    )
    or not exists(
      select 1 from storage.objects object
      where object.bucket_id='room-media' and object.name=selected.thumbnail_object_key
        and object.metadata->>'mimetype'='image/jpeg'
        and coalesce(nullif(object.metadata->>'size','')::bigint,-1)=selected.thumbnail_byte_size
    ) then
    raise exception using errcode='22023',message='media_upload_not_found';
  end if;
  update public.assets set status='ready',ready_at=statement_timestamp() where id=selected.id returning * into selected;
  return query select selected.id,selected.object_key,selected.thumbnail_object_key,selected.mime_type,selected.byte_size,selected.thumbnail_byte_size,selected.placeholder_data_url;
end; $$;

create function public.prepare_room_media_upload_v2(text,bigint,bigint,text,integer,integer)
returns table(asset_id uuid,object_key text,thumbnail_object_key text)
language sql security invoker set search_path=''
as $$select * from security.prepare_room_media_upload_v2($1,$2,$3,$4,$5,$6);$$;

create function public.finalize_room_media_upload_v2(uuid)
returns table(asset_id uuid,object_key text,thumbnail_object_key text,mime_type text,byte_size bigint,thumbnail_byte_size bigint,placeholder_data_url text)
language sql security invoker set search_path=''
as $$select * from security.finalize_room_media_upload_v2($1);$$;

revoke all on function security.prepare_room_media_upload_v2(text,bigint,bigint,text,integer,integer),security.finalize_room_media_upload_v2(uuid) from public,anon,service_role;
grant execute on function security.prepare_room_media_upload_v2(text,bigint,bigint,text,integer,integer),security.finalize_room_media_upload_v2(uuid) to authenticated;
revoke all on function public.prepare_room_media_upload_v2(text,bigint,bigint,text,integer,integer),public.finalize_room_media_upload_v2(uuid) from public,anon,service_role;
grant execute on function public.prepare_room_media_upload_v2(text,bigint,bigint,text,integer,integer),public.finalize_room_media_upload_v2(uuid) to authenticated;

drop policy room_media_insert on storage.objects;
create policy room_media_insert on storage.objects for insert to authenticated with check(
  bucket_id='room-media' and exists(
    select 1 from public.assets asset
    join public.actors actor on actor.id=asset.owner_actor_id
    where (asset.object_key=name or asset.thumbnail_object_key=name)
      and asset.status='pending' and actor.owner_user_id=(select auth.uid())
  )
);

drop policy room_media_select on storage.objects;
create policy room_media_select on storage.objects for select to authenticated using(
  bucket_id='room-media' and exists(
    select 1 from public.assets asset
    where (asset.object_key=name or asset.thumbnail_object_key=name) and (
      exists(select 1 from public.actors actor where actor.id=asset.owner_actor_id and actor.owner_user_id=(select auth.uid()))
      or exists(select 1 from public.messages message where message.asset_id=asset.id and (select security.can_read_room(message.room_id)))
      or exists(select 1 from public.photos photo where photo.asset_id=asset.id and (select security.can_read_room(photo.room_id)))
      or (select security.can_read_avatar_asset(asset.id))
    )
  )
);

drop policy room_media_delete on storage.objects;
create policy room_media_delete on storage.objects for delete to authenticated using(
  bucket_id='room-media' and exists(
    select 1 from public.photos photo
    join public.room_members membership on membership.room_id=photo.room_id
    join public.actors actor on actor.id=membership.actor_id
    join public.assets asset on asset.id=photo.asset_id
    where (asset.object_key=name or asset.thumbnail_object_key=name)
      and actor.owner_user_id=(select auth.uid()) and membership.state='active'
      and (membership.actor_id=photo.owner_actor_id or membership.role='host')
  )
);

insert into private.schema_versions(component,version) values('photo_media_variants',1)
on conflict(component) do update set version=excluded.version,applied_at=now();
