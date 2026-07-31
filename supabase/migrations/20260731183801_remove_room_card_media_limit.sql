create or replace function public.list_room_card_media(requested_room_ids uuid[])
returns table(
  photo_id uuid,
  room_id uuid,
  asset_id uuid,
  owner_actor_id uuid,
  original_name text,
  aspect_ratio double precision,
  note text,
  created_at timestamptz,
  photo_count bigint,
  kind text,
  status text,
  object_key text,
  mime_type text,
  byte_size bigint,
  thumbnail_object_key text,
  thumbnail_byte_size bigint,
  placeholder_data_url text,
  image_width integer,
  image_height integer,
  media_revision integer
)
language sql security invoker set search_path=''
as $$
  with room_photos as (
    select
      photo.id,
      photo.room_id,
      photo.asset_id,
      photo.owner_actor_id,
      photo.original_name,
      photo.aspect_ratio,
      photo.note,
      photo.created_at,
      count(*) over (partition by photo.room_id) as photo_count
    from public.photos photo
    where photo.room_id = any(requested_room_ids)
  )
  select
    photo.id,
    photo.room_id,
    photo.asset_id,
    photo.owner_actor_id,
    photo.original_name,
    photo.aspect_ratio,
    photo.note,
    photo.created_at,
    photo.photo_count,
    asset.kind,
    asset.status,
    asset.object_key,
    asset.mime_type,
    asset.byte_size,
    asset.thumbnail_object_key,
    asset.thumbnail_byte_size,
    asset.placeholder_data_url,
    asset.image_width,
    asset.image_height,
    asset.media_revision
  from room_photos photo
  join public.assets asset on asset.id = photo.asset_id
  where asset.kind = 'image'
    and asset.status = 'ready'
    and asset.object_key is not null
    and asset.mime_type is not null
    and asset.byte_size is not null
  order by photo.room_id, photo.created_at desc, photo.id desc;
$$;

revoke all on function public.list_room_card_media(uuid[]) from public, anon, service_role;
grant execute on function public.list_room_card_media(uuid[]) to authenticated;

insert into private.schema_versions(component,version) values('room_media_read_projection',2)
on conflict(component) do update set version=excluded.version,applied_at=now();
