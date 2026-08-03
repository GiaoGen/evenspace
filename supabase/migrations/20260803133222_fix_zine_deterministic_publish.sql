-- Replace the deployed body so its final upload query does not reuse the
-- PL/pgSQL `draft` record name as a table alias.
create or replace function security.publish_zine_deterministic(
  requested_zine_public_id text,requested_chapter_basis text,requested_layout_document jsonb
) returns table(version_id uuid,version_number integer,status text)
language plpgsql security definer set search_path=''
as $$
declare
  selected_zine public.zines%rowtype; new_source_id uuid; new_version_id uuid;
  new_version_number integer; draft record; new_source_photo_id uuid; layout_text jsonb;
begin
  select * into selected_zine from public.zines zine
  where zine.public_id=requested_zine_public_id and zine.deleted_at is null limit 1 for update;
  if selected_zine.id is null or not (select security.can_manage_zine(selected_zine.id)) then
    raise exception using errcode='42501',message='zine_manage_permission_required';
  end if;
  if selected_zine.status<>'draft' then raise exception using errcode='22023',message='zine_draft_is_frozen'; end if;
  if requested_chapter_basis not in ('itinerary','captured-time')
    or jsonb_typeof(requested_layout_document)<>'object'
    or requested_layout_document->>'version'<>'1'
    or requested_layout_document->>'style'<>selected_zine.style then
    raise exception using errcode='22023',message='invalid_zine_layout';
  end if;
  if (select count(*) from public.zine_draft_photos where zine_id=selected_zine.id) not between 1 and 48 then
    raise exception using errcode='22023',message='zine_photo_required';
  end if;

  insert into public.zine_sources(zine_id,status,chapter_basis,consent_version,photo_count,frozen_at)
  values(selected_zine.id,'frozen',requested_chapter_basis,'manual-v1',
    (select count(*) from public.zine_draft_photos where zine_id=selected_zine.id),statement_timestamp())
  returning id into new_source_id;

  for draft in
    select choice.*,asset.id as asset_id,asset.object_key,asset.image_width,asset.image_height,
      coalesce(photo.original_name,split_part(asset.object_key,'/',-2)||'.jpg') as original_name,
      photo.aspect_ratio,coalesce(photo.created_at,upload.created_at) as captured_at
    from public.zine_draft_photos choice
    left join public.photos photo on photo.id=choice.room_photo_id
    left join public.zine_uploads upload on upload.id=choice.upload_id
    join public.assets asset on asset.id=coalesce(photo.asset_id,upload.asset_id) and asset.status='ready'
    where choice.zine_id=selected_zine.id order by choice.ordinal
  loop
    insert into public.zine_source_photos(
      source_id,asset_id,original_photo_id,original_asset_id,ordinal,original_name,width,height,captured_at,alt_text
    ) values(
      new_source_id,draft.asset_id,draft.room_photo_id,
      case when draft.room_photo_id is not null then draft.asset_id else null end,
      draft.ordinal,left(draft.original_name,160),coalesce(draft.image_width,1200),
      coalesce(draft.image_height,greatest(1,round(1200/coalesce(draft.aspect_ratio,1))::integer)),
      draft.captured_at,'Selected photograph '||draft.ordinal
    ) returning id into new_source_photo_id;
    if draft.text_kind<>'none' then
      select value into layout_text from jsonb_array_elements(requested_layout_document->'texts')
      where value->>'photoId'=coalesce(draft.room_photo_id,draft.upload_id)::text limit 1;
      if layout_text is null or layout_text->>'kind'<>draft.text_kind then
        raise exception using errcode='22023',message='invalid_zine_text';
      end if;
      if draft.text_kind='comment' then
        insert into public.zine_source_texts(source_photo_id,kind,original_comment_id,body,author_display_name)
        select new_source_photo_id,'comment',comment.id,layout_text->>'body',membership.nickname
        from public.photo_comments comment
        join public.room_members membership on membership.room_id=comment.room_id and membership.actor_id=comment.actor_id
        where comment.id=draft.comment_id and comment.photo_id=draft.room_photo_id;
      else
        insert into public.zine_source_texts(source_photo_id,kind,body)
        values(new_source_photo_id,'reflection',layout_text->>'body');
      end if;
    end if;
  end loop;

  select coalesce(max(existing.version_number),0)+1 into new_version_number
  from public.zine_versions existing where existing.zine_id=selected_zine.id;
  insert into public.zine_versions(
    zine_id,source_id,version_number,style,template_id,layout_document,status,is_current,ready_at
  ) values(selected_zine.id,new_source_id,new_version_number,selected_zine.style,
    selected_zine.style||'-v1',requested_layout_document,'ready',true,statement_timestamp())
  returning id into new_version_id;
  update public.zines set status='ready' where id=selected_zine.id;
  update public.zine_uploads upload set status='attached'
  where upload.zine_id=selected_zine.id and exists(
    select 1 from public.zine_draft_photos selected_draft
    where selected_draft.zine_id=selected_zine.id and selected_draft.upload_id=upload.id
  );
  version_id:=new_version_id; version_number:=new_version_number; status:='ready'; return next;
end;
$$;
