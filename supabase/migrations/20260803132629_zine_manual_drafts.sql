-- Editable manual zine drafts and deterministic publishing. Draft rows remain
-- mutable until compose; source snapshots and versions remain immutable.

create table public.zine_draft_photos (
  id uuid primary key default gen_random_uuid(),
  zine_id uuid not null references public.zines(id) on delete cascade,
  ordinal smallint not null,
  room_photo_id uuid references public.photos(id) on delete cascade,
  upload_id uuid references public.zine_uploads(id) on delete cascade,
  text_kind text not null default 'none',
  comment_id uuid references public.photo_comments(id) on delete set null,
  reflection_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zine_draft_photos_ordinal_unique unique(zine_id,ordinal),
  constraint zine_draft_photos_room_unique unique(zine_id,room_photo_id),
  constraint zine_draft_photos_upload_unique unique(zine_id,upload_id),
  constraint zine_draft_photos_ordinal_valid check(ordinal between 1 and 48),
  constraint zine_draft_photos_source_valid check(
    (room_photo_id is not null and upload_id is null)
    or (room_photo_id is null and upload_id is not null)
  ),
  constraint zine_draft_photos_text_kind_valid check(text_kind in ('none','comment','reflection')),
  constraint zine_draft_photos_text_valid check(
    (text_kind='none' and comment_id is null and reflection_body is null)
    or (text_kind='comment' and comment_id is not null and reflection_body is null)
    or (text_kind='reflection' and comment_id is null and reflection_body is not null
      and reflection_body=btrim(reflection_body) and char_length(reflection_body) between 1 and 500)
  )
);
create index zine_draft_photos_zine_idx on public.zine_draft_photos(zine_id,ordinal);
create index zine_draft_photos_room_photo_idx on public.zine_draft_photos(room_photo_id)
  where room_photo_id is not null;
create index zine_draft_photos_upload_idx on public.zine_draft_photos(upload_id)
  where upload_id is not null;
create index zine_draft_photos_comment_idx on public.zine_draft_photos(comment_id)
  where comment_id is not null;
create trigger zine_draft_photos_set_updated_at before update on public.zine_draft_photos
  for each row execute function private.set_updated_at();

alter table public.zine_draft_photos enable row level security;
alter table public.zine_draft_photos force row level security;
revoke all on public.zine_draft_photos from public,anon;
grant select on public.zine_draft_photos to authenticated;
grant all privileges on public.zine_draft_photos to service_role;
create policy zine_draft_photos_manager_read on public.zine_draft_photos for select to authenticated
  using((select security.can_manage_zine(zine_id)));

create function security.get_zine_studio(requested_zine_public_id text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare selected_zine public.zines%rowtype; result jsonb;
begin
  select * into selected_zine from public.zines zine
  where zine.public_id=requested_zine_public_id and zine.deleted_at is null limit 1;
  if selected_zine.id is null or not (select security.can_manage_zine(selected_zine.id)) then
    raise exception using errcode='42501',message='zine_manage_permission_required';
  end if;
  select jsonb_build_object(
    'publicId',selected_zine.public_id,'kind',selected_zine.kind,'status',selected_zine.status,
    'title',selected_zine.title,'style',selected_zine.style,
    'roomPublicId',(select room.public_id from public.rooms room where room.id=selected_zine.room_id),
    'roomName',(select room.name from public.rooms room where room.id=selected_zine.room_id),
    'photos',coalesce((
      select jsonb_agg(jsonb_build_object(
        'sourceId',source.source_id,'assetId',source.asset_id,'originalName',source.original_name,
        'width',source.image_width,'height',source.image_height,'capturedAt',source.captured_at,
        'objectKey',source.object_key,'thumbnailObjectKey',source.thumbnail_object_key,
        'placeholderDataUrl',source.placeholder_data_url,'selected',source.selected,
        'textKind',source.text_kind,'commentId',source.comment_id,'reflection',source.reflection_body,
        'comments',source.comments
      ) order by source.captured_at,source.source_id)
      from (
        select photo.id as source_id,photo.asset_id,photo.original_name,
          coalesce(asset.image_width,1200) as image_width,
          coalesce(asset.image_height,greatest(1,round(1200/photo.aspect_ratio)::integer)) as image_height,
          photo.created_at as captured_at,asset.object_key,asset.thumbnail_object_key,asset.placeholder_data_url,
          draft.id is not null as selected,coalesce(draft.text_kind,'none') as text_kind,
          draft.comment_id,draft.reflection_body,
          coalesce((select jsonb_agg(jsonb_build_object('id',comment.id,'body',comment.body,'authorName',membership.nickname)
            order by comment.created_at,comment.id)
            from public.photo_comments comment
            join public.room_members membership on membership.room_id=comment.room_id and membership.actor_id=comment.actor_id
            where comment.photo_id=photo.id),'[]'::jsonb) as comments
        from public.photos photo join public.assets asset on asset.id=photo.asset_id and asset.status='ready'
        left join public.zine_draft_photos draft on draft.zine_id=selected_zine.id and draft.room_photo_id=photo.id
        where selected_zine.kind='room' and photo.room_id=selected_zine.room_id
        union all
        select upload.id,upload.asset_id,split_part(asset.object_key,'/',-2)||'.jpg',
          asset.image_width,asset.image_height,upload.created_at,asset.object_key,asset.thumbnail_object_key,
          asset.placeholder_data_url,draft.id is not null,coalesce(draft.text_kind,'none'),null,
          draft.reflection_body,'[]'::jsonb
        from public.zine_uploads upload join public.assets asset on asset.id=upload.asset_id and asset.status='ready'
        left join public.zine_draft_photos draft on draft.zine_id=selected_zine.id and draft.upload_id=upload.id
        where selected_zine.kind='standalone' and upload.zine_id=selected_zine.id and upload.status in ('ready','attached')
      ) source
    ),'[]'::jsonb),
    'itinerary',coalesce((select jsonb_agg(jsonb_build_object(
      'id',item.id,'title',item.title,'startsAt',item.starts_at,
      'endsAt',coalesce(item.ended_at,item.planned_ends_at)
    ) order by item.starts_at,item.id) from public.itineraries item
      where item.room_id=selected_zine.room_id),'[]'::jsonb),
    'currentLayout',(select version.layout_document from public.zine_versions version
      where version.zine_id=selected_zine.id and version.is_current limit 1)
  ) into result;
  return result;
end;
$$;

create function public.get_zine_studio(requested_zine_public_id text)
returns jsonb language sql stable security invoker set search_path=''
as $$ select security.get_zine_studio(requested_zine_public_id) $$;

create function security.get_zine_asset_path(requested_zine_public_id text,requested_asset_id uuid)
returns table(bucket_id text,object_key text)
language sql stable security definer set search_path=''
as $$
  select case when asset.object_key like 'zines/%' then 'zine-media' else 'room-media' end,asset.object_key
  from public.zines zine
  join public.zine_versions version on version.zine_id=zine.id and version.is_current and version.status='ready'
  join public.zine_source_photos photo on photo.source_id=version.source_id and photo.asset_id=requested_asset_id
  join public.assets asset on asset.id=photo.asset_id and asset.status='ready'
  where zine.public_id=requested_zine_public_id and zine.status='ready'
    and (select security.can_read_zine(zine.id))
  limit 1
$$;

create function public.get_zine_asset_path(requested_zine_public_id text,requested_asset_id uuid)
returns table(bucket_id text,object_key text)
language sql stable security invoker set search_path=''
as $$ select * from security.get_zine_asset_path(requested_zine_public_id,requested_asset_id) $$;

create function security.save_zine_manual_draft(
  requested_zine_public_id text,
  requested_title text,
  requested_style text,
  requested_photos jsonb
) returns table(zine_id uuid,selected_count integer,updated_at timestamptz)
language plpgsql security definer set search_path=''
as $$
declare
  selected_zine public.zines%rowtype;
  photo_count integer;
  inserted_count integer;
begin
  select * into selected_zine from public.zines zine
  where zine.public_id=requested_zine_public_id and zine.deleted_at is null limit 1 for update;
  if selected_zine.id is null or not (select security.can_manage_zine(selected_zine.id)) then
    raise exception using errcode='42501',message='zine_manage_permission_required';
  end if;
  if selected_zine.status<>'draft' then
    raise exception using errcode='22023',message='zine_draft_is_frozen';
  end if;
  if requested_title is null or requested_title<>btrim(requested_title)
    or char_length(requested_title) not between 1 and 80
    or requested_style not in ('quiet-field','living-sequence') then
    raise exception using errcode='22023',message='invalid_zine_draft';
  end if;
  if jsonb_typeof(requested_photos)<>'array' then
    raise exception using errcode='22023',message='invalid_zine_photos';
  end if;
  photo_count:=jsonb_array_length(requested_photos);
  if photo_count not between 1 and 48 then
    raise exception using errcode='22023',message=case when photo_count>48 then 'zine_photo_limit_reached' else 'zine_photo_required' end;
  end if;

  delete from public.zine_draft_photos draft where draft.zine_id=selected_zine.id;

  if selected_zine.kind='room' then
    insert into public.zine_draft_photos(
      zine_id,ordinal,room_photo_id,text_kind,comment_id,reflection_body
    )
    select selected_zine.id,item.ordinality::smallint,photo.id,
      item.value->>'textKind',
      case when item.value->>'textKind'='comment' then (item.value->>'commentId')::uuid else null end,
      case when item.value->>'textKind'='reflection' then btrim(item.value->>'reflection') else null end
    from jsonb_array_elements(requested_photos) with ordinality item(value,ordinality)
    join public.photos photo on photo.id=(item.value->>'sourceId')::uuid
      and photo.room_id=selected_zine.room_id
    where item.value->>'textKind' in ('none','comment','reflection')
      and (
        item.value->>'textKind'<>'comment'
        or exists(select 1 from public.photo_comments comment
          where comment.id=(item.value->>'commentId')::uuid
            and comment.photo_id=photo.id and comment.room_id=selected_zine.room_id)
      );
  else
    insert into public.zine_draft_photos(
      zine_id,ordinal,upload_id,text_kind,comment_id,reflection_body
    )
    select selected_zine.id,item.ordinality::smallint,upload.id,
      item.value->>'textKind',null,
      case when item.value->>'textKind'='reflection' then btrim(item.value->>'reflection') else null end
    from jsonb_array_elements(requested_photos) with ordinality item(value,ordinality)
    join public.zine_uploads upload on upload.id=(item.value->>'sourceId')::uuid
      and upload.zine_id=selected_zine.id and upload.status in ('ready','attached')
    where item.value->>'textKind' in ('none','reflection');
  end if;

  get diagnostics inserted_count=row_count;
  if inserted_count<>photo_count then
    raise exception using errcode='22023',message='invalid_zine_photo_selection';
  end if;

  update public.zines zine set title=requested_title,style=requested_style
  where zine.id=selected_zine.id
  returning zine.updated_at into updated_at;
  zine_id:=selected_zine.id;
  selected_count:=inserted_count;
  return next;
end;
$$;

create function public.save_zine_manual_draft(
  requested_zine_public_id text,
  requested_title text,
  requested_style text,
  requested_photos jsonb
) returns table(zine_id uuid,selected_count integer,updated_at timestamptz)
language sql security invoker set search_path=''
as $$ select * from security.save_zine_manual_draft(
  requested_zine_public_id,requested_title,requested_style,requested_photos
) $$;

create function security.publish_zine_deterministic(
  requested_zine_public_id text,
  requested_chapter_basis text,
  requested_layout_document jsonb
) returns table(version_id uuid,version_number integer,status text)
language plpgsql security definer set search_path=''
as $$
declare
  selected_zine public.zines%rowtype;
  new_source_id uuid;
  new_version_id uuid;
  new_version_number integer;
  draft record;
  new_source_photo_id uuid;
  layout_text jsonb;
begin
  select * into selected_zine from public.zines zine
  where zine.public_id=requested_zine_public_id and zine.deleted_at is null limit 1 for update;
  if selected_zine.id is null or not (select security.can_manage_zine(selected_zine.id)) then
    raise exception using errcode='42501',message='zine_manage_permission_required';
  end if;
  if selected_zine.status<>'draft' then
    raise exception using errcode='22023',message='zine_draft_is_frozen';
  end if;
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
      photo.aspect_ratio,
      coalesce(photo.created_at,upload.created_at) as captured_at
    from public.zine_draft_photos choice
    left join public.photos photo on photo.id=choice.room_photo_id
    left join public.zine_uploads upload on upload.id=choice.upload_id
    join public.assets asset on asset.id=coalesce(photo.asset_id,upload.asset_id) and asset.status='ready'
    where choice.zine_id=selected_zine.id order by choice.ordinal
  loop
    insert into public.zine_source_photos(
      source_id,asset_id,original_photo_id,original_asset_id,ordinal,original_name,
      width,height,captured_at,alt_text
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
  ) values(
    selected_zine.id,new_source_id,new_version_number,selected_zine.style,
    selected_zine.style||'-v1',requested_layout_document,'ready',true,statement_timestamp()
  ) returning id into new_version_id;
  update public.zines set status='ready' where id=selected_zine.id;
  update public.zine_uploads upload set status='attached'
    where upload.zine_id=selected_zine.id and exists(
      select 1 from public.zine_draft_photos selected_draft where selected_draft.zine_id=selected_zine.id and selected_draft.upload_id=upload.id
    );
  version_id:=new_version_id; version_number:=new_version_number; status:='ready'; return next;
end;
$$;

create function public.publish_zine_deterministic(
  requested_zine_public_id text,
  requested_chapter_basis text,
  requested_layout_document jsonb
) returns table(version_id uuid,version_number integer,status text)
language sql security invoker set search_path=''
as $$ select * from security.publish_zine_deterministic(
  requested_zine_public_id,requested_chapter_basis,requested_layout_document
) $$;

revoke all on function security.get_zine_studio(text),security.get_zine_asset_path(text,uuid),
  security.save_zine_manual_draft(text,text,text,jsonb),
  security.publish_zine_deterministic(text,text,jsonb) from public,anon,authenticated;
grant execute on function security.get_zine_studio(text),security.get_zine_asset_path(text,uuid),
  security.save_zine_manual_draft(text,text,text,jsonb),
  security.publish_zine_deterministic(text,text,jsonb) to service_role;
revoke all on function public.get_zine_studio(text),public.get_zine_asset_path(text,uuid),
  public.save_zine_manual_draft(text,text,text,jsonb),
  public.publish_zine_deterministic(text,text,jsonb) from public,anon;
grant execute on function public.get_zine_studio(text),public.get_zine_asset_path(text,uuid),
  public.save_zine_manual_draft(text,text,text,jsonb),
  public.publish_zine_deterministic(text,text,jsonb) to authenticated,service_role;

insert into private.schema_versions(component,version)
values('zine_manual_drafts',1)
on conflict(component) do update set version=excluded.version,applied_at=now();

notify pgrst,'reload schema';
