drop function public.prepare_room_media_upload(text,text,text,bigint,integer);
drop function public.finalize_room_media_upload(uuid);
drop function public.create_room_photo(text,uuid,text,double precision);
drop function public.add_photo_comment(uuid,text);
drop function public.delete_room_photo(uuid);

create function public.prepare_room_media_upload(
  requested_room_public_id text,
  requested_kind text,
  requested_mime_type text,
  requested_byte_size bigint,
  requested_duration_ms integer default null
) returns table(asset_id uuid,object_key text)
language sql security invoker set search_path=''
as $$select * from security.prepare_room_media_upload(requested_room_public_id,requested_kind,requested_mime_type,requested_byte_size,requested_duration_ms);$$;

create function public.finalize_room_media_upload(requested_asset_id uuid)
returns table(asset_id uuid,object_key text,kind text,mime_type text,byte_size bigint,duration_ms integer)
language sql security invoker set search_path=''
as $$select * from security.finalize_room_media_upload(requested_asset_id);$$;

create function public.create_room_photo(
  requested_room_public_id text,
  requested_asset_id uuid,
  requested_original_name text,
  requested_aspect_ratio double precision
) returns table(photo_id uuid,created_at timestamptz)
language sql security invoker set search_path=''
as $$select * from security.create_room_photo(requested_room_public_id,requested_asset_id,requested_original_name,requested_aspect_ratio);$$;

create function public.add_photo_comment(
  requested_photo_id uuid,
  requested_body text
) returns table(comment_id uuid,created_at timestamptz)
language sql security invoker set search_path=''
as $$select * from security.add_photo_comment(requested_photo_id,requested_body);$$;

create function public.delete_room_photo(requested_photo_id uuid)
returns table(photo_id uuid,asset_id uuid,object_key text)
language sql security invoker set search_path=''
as $$select * from security.delete_room_photo(requested_photo_id);$$;

revoke all on function public.prepare_room_media_upload(text,text,text,bigint,integer),public.finalize_room_media_upload(uuid),public.create_room_photo(text,uuid,text,double precision),public.add_photo_comment(uuid,text),public.delete_room_photo(uuid) from public,anon,service_role;
grant execute on function public.prepare_room_media_upload(text,text,text,bigint,integer),public.finalize_room_media_upload(uuid),public.create_room_photo(text,uuid,text,double precision),public.add_photo_comment(uuid,text),public.delete_room_photo(uuid) to authenticated;
