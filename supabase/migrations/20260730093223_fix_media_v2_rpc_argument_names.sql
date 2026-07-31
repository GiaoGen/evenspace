drop function public.prepare_room_media_upload_v2(text,bigint,bigint,text,integer,integer);
drop function public.finalize_room_media_upload_v2(uuid);

create function public.prepare_room_media_upload_v2(
  requested_room_public_id text,
  requested_display_byte_size bigint,
  requested_thumbnail_byte_size bigint,
  requested_placeholder_data_url text,
  requested_image_width integer,
  requested_image_height integer
)
returns table(asset_id uuid,object_key text,thumbnail_object_key text)
language sql security invoker set search_path=''
as $$
  select * from security.prepare_room_media_upload_v2(
    requested_room_public_id,
    requested_display_byte_size,
    requested_thumbnail_byte_size,
    requested_placeholder_data_url,
    requested_image_width,
    requested_image_height
  );
$$;

create function public.finalize_room_media_upload_v2(requested_asset_id uuid)
returns table(asset_id uuid,object_key text,thumbnail_object_key text,mime_type text,byte_size bigint,thumbnail_byte_size bigint,placeholder_data_url text)
language sql security invoker set search_path=''
as $$select * from security.finalize_room_media_upload_v2(requested_asset_id);$$;

revoke all on function public.prepare_room_media_upload_v2(text,bigint,bigint,text,integer,integer),public.finalize_room_media_upload_v2(uuid) from public,anon,service_role;
grant execute on function public.prepare_room_media_upload_v2(text,bigint,bigint,text,integer,integer),public.finalize_room_media_upload_v2(uuid) to authenticated;

notify pgrst, 'reload schema';
