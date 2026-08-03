-- Immutable zine sources, versioned layouts, durable generation jobs, and
-- private standalone-book uploads. AI execution and draft UI are later phases.

create table public.zines (
  id uuid primary key default gen_random_uuid(),
  public_id text not null default (
    'zine_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20)
  ),
  kind text not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_by_actor_id uuid references public.actors(id) on delete set null,
  room_id uuid references public.rooms(id) on delete restrict,
  title text not null,
  style text not null,
  status text not null default 'draft',
  visibility text not null default 'private',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint zines_public_id_unique unique(public_id),
  constraint zines_public_id_valid check(public_id ~ '^zine_[a-z0-9]{12,40}$'),
  constraint zines_kind_valid check(kind in ('room','standalone')),
  constraint zines_source_valid check(
    (kind='room' and room_id is not null)
    or (kind='standalone' and room_id is null)
  ),
  constraint zines_owner_valid check(owner_user_id is not null or deleted_at is not null),
  constraint zines_title_valid check(title=btrim(title) and char_length(title) between 1 and 80),
  constraint zines_style_valid check(style in ('quiet-field','living-sequence')),
  constraint zines_status_valid check(status in ('draft','generating','ready','failed','deleted')),
  constraint zines_visibility_private check(visibility='private'),
  constraint zines_deleted_state_valid check(
    (status='deleted' and deleted_at is not null)
    or (status<>'deleted' and deleted_at is null)
  )
);

create unique index zines_one_live_book_per_room_idx
  on public.zines(room_id)
  where room_id is not null and deleted_at is null;
create index zines_owner_updated_idx
  on public.zines(owner_user_id,updated_at desc,id desc)
  where owner_user_id is not null and deleted_at is null;

create table public.zine_sources (
  id uuid primary key default gen_random_uuid(),
  zine_id uuid not null references public.zines(id) on delete cascade,
  schema_version integer not null default 1,
  status text not null default 'building',
  chapter_basis text not null,
  consent_version text not null,
  room_revision bigint,
  photo_count smallint not null default 0,
  frozen_at timestamptz,
  created_at timestamptz not null default now(),
  constraint zine_sources_zine_id_unique unique(zine_id,id),
  constraint zine_sources_schema_version_valid check(schema_version>0),
  constraint zine_sources_status_valid check(status in ('building','frozen','failed')),
  constraint zine_sources_chapter_basis_valid check(chapter_basis in ('itinerary','captured-time','ai-fallback')),
  constraint zine_sources_consent_version_valid check(
    consent_version=btrim(consent_version) and char_length(consent_version) between 1 and 40
  ),
  constraint zine_sources_room_revision_valid check(room_revision is null or room_revision>0),
  constraint zine_sources_photo_count_valid check(photo_count between 0 and 48),
  constraint zine_sources_frozen_state_valid check(
    (status='frozen' and frozen_at is not null and photo_count between 1 and 48)
    or (status<>'frozen' and frozen_at is null)
  )
);
create index zine_sources_zine_created_idx on public.zine_sources(zine_id,created_at desc,id desc);

create table public.zine_source_photos (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.zine_sources(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete restrict,
  original_photo_id uuid references public.photos(id) on delete set null,
  original_asset_id uuid references public.assets(id) on delete set null,
  ordinal smallint not null,
  original_name text not null,
  width integer not null,
  height integer not null,
  captured_at timestamptz,
  alt_text text not null,
  created_at timestamptz not null default now(),
  constraint zine_source_photos_source_ordinal_unique unique(source_id,ordinal),
  constraint zine_source_photos_source_asset_unique unique(source_id,asset_id),
  constraint zine_source_photos_ordinal_valid check(ordinal between 1 and 48),
  constraint zine_source_photos_name_valid check(
    original_name=btrim(original_name) and char_length(original_name) between 1 and 160
  ),
  constraint zine_source_photos_dimensions_valid check(width between 1 and 20000 and height between 1 and 20000),
  constraint zine_source_photos_alt_valid check(
    alt_text=btrim(alt_text) and char_length(alt_text) between 1 and 240
  )
);
create index zine_source_photos_source_idx on public.zine_source_photos(source_id,ordinal);
create index zine_source_photos_original_photo_idx on public.zine_source_photos(original_photo_id)
  where original_photo_id is not null;

create table public.zine_source_texts (
  id uuid primary key default gen_random_uuid(),
  source_photo_id uuid not null references public.zine_source_photos(id) on delete cascade,
  kind text not null,
  original_comment_id uuid references public.photo_comments(id) on delete set null,
  body text not null,
  author_display_name text,
  created_at timestamptz not null default now(),
  constraint zine_source_texts_one_per_photo unique(source_photo_id),
  constraint zine_source_texts_kind_valid check(kind in ('comment','reflection')),
  constraint zine_source_texts_body_valid check(
    body=btrim(body) and char_length(body) between 1 and 500
  ),
  constraint zine_source_texts_author_valid check(
    (kind='comment' and author_display_name is not null
      and author_display_name=btrim(author_display_name)
      and char_length(author_display_name) between 1 and 80)
    or (kind='reflection' and author_display_name is null)
  )
);

create table public.zine_versions (
  id uuid primary key default gen_random_uuid(),
  zine_id uuid not null references public.zines(id) on delete cascade,
  source_id uuid not null,
  version_number integer not null,
  style text not null,
  template_id text not null,
  layout_document jsonb,
  status text not null default 'composing',
  is_current boolean not null default false,
  failure_code text,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  constraint zine_versions_source_same_zine
    foreign key(zine_id,source_id) references public.zine_sources(zine_id,id),
  constraint zine_versions_number_unique unique(zine_id,version_number),
  constraint zine_versions_number_valid check(version_number>0),
  constraint zine_versions_style_valid check(style in ('quiet-field','living-sequence')),
  constraint zine_versions_template_valid check(
    template_id=btrim(template_id) and char_length(template_id) between 1 and 40
  ),
  constraint zine_versions_status_valid check(status in ('composing','review','ready','failed','superseded')),
  constraint zine_versions_layout_object check(
    layout_document is null or jsonb_typeof(layout_document)='object'
  ),
  constraint zine_versions_ready_state_valid check(
    (status='ready' and layout_document is not null and ready_at is not null)
    or (status<>'ready' and (not is_current) and ready_at is null)
  ),
  constraint zine_versions_failure_code_valid check(
    failure_code is null or (failure_code=btrim(failure_code) and char_length(failure_code) between 1 and 80)
  )
);
create unique index zine_versions_one_current_idx on public.zine_versions(zine_id) where is_current;
create index zine_versions_zine_created_idx on public.zine_versions(zine_id,created_at desc,id desc);

create table public.zine_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  zine_id uuid not null references public.zines(id) on delete cascade,
  source_id uuid not null,
  requested_by_user_id uuid references auth.users(id) on delete set null,
  idempotency_key uuid not null,
  kind text not null,
  status text not null default 'queued',
  stage text not null default 'preparing-photographs',
  attempt_count integer not null default 1,
  provider text,
  model text,
  prompt_version text,
  error_code text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint zine_generation_jobs_source_same_zine
    foreign key(zine_id,source_id) references public.zine_sources(zine_id,id),
  constraint zine_generation_jobs_idempotent unique(zine_id,idempotency_key),
  constraint zine_generation_jobs_kind_valid check(kind in ('compose','recompose','change-style')),
  constraint zine_generation_jobs_status_valid check(status in ('queued','running','succeeded','failed','cancelled')),
  constraint zine_generation_jobs_stage_valid check(stage in (
    'preparing-photographs','building-chapters','composing-pages','reviewing-book','complete'
  )),
  constraint zine_generation_jobs_attempt_valid check(attempt_count between 1 and 5),
  constraint zine_generation_jobs_provider_valid check(provider is null or char_length(btrim(provider)) between 1 and 60),
  constraint zine_generation_jobs_model_valid check(model is null or char_length(btrim(model)) between 1 and 100),
  constraint zine_generation_jobs_prompt_valid check(prompt_version is null or char_length(btrim(prompt_version)) between 1 and 60),
  constraint zine_generation_jobs_error_valid check(error_code is null or char_length(btrim(error_code)) between 1 and 80),
  constraint zine_generation_jobs_finished_state_valid check(
    (status in ('succeeded','failed','cancelled') and finished_at is not null)
    or (status in ('queued','running') and finished_at is null)
  )
);
create index zine_generation_jobs_queue_idx
  on public.zine_generation_jobs(status,created_at,id)
  where status in ('queued','running');
create index zine_generation_jobs_zine_idx on public.zine_generation_jobs(zine_id,created_at desc,id desc);

create table public.zine_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.zine_generation_jobs(id) on delete restrict,
  provider_request_id text not null,
  metric text not null,
  quantity bigint not null,
  cost_micros bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint zine_usage_ledger_request_metric_unique unique(provider_request_id,metric),
  constraint zine_usage_ledger_request_valid check(
    provider_request_id=btrim(provider_request_id) and char_length(provider_request_id) between 1 and 160
  ),
  constraint zine_usage_ledger_metric_valid check(metric in ('input-token','output-token','input-image','render-review')),
  constraint zine_usage_ledger_quantity_valid check(quantity>=0),
  constraint zine_usage_ledger_cost_valid check(cost_micros>=0)
);
create index zine_usage_ledger_job_idx on public.zine_usage_ledger(job_id,created_at,id);

create table public.zine_uploads (
  id uuid primary key default gen_random_uuid(),
  zine_id uuid not null references public.zines(id) on delete cascade,
  asset_id uuid not null unique references public.assets(id) on delete restrict,
  idempotency_key uuid not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  constraint zine_uploads_idempotent unique(zine_id,idempotency_key),
  constraint zine_uploads_status_valid check(status in ('pending','ready','attached','deleted')),
  constraint zine_uploads_ready_state_valid check(
    (status in ('ready','attached') and ready_at is not null)
    or (status in ('pending','deleted'))
  )
);
create index zine_uploads_zine_status_idx on public.zine_uploads(zine_id,status,created_at,id);

create trigger zines_set_updated_at before update on public.zines
  for each row execute function private.set_updated_at();
create trigger zine_generation_jobs_set_updated_at before update on public.zine_generation_jobs
  for each row execute function private.set_updated_at();

create function security.can_read_zine(target_zine_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.zines zine
    where zine.id=target_zine_id and zine.deleted_at is null and (
      zine.owner_user_id=(select auth.uid())
      or (zine.room_id is not null and (select security.can_read_room(zine.room_id)))
    )
  );
$$;

create function security.can_manage_zine(target_zine_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.zines zine
    where zine.id=target_zine_id and zine.deleted_at is null and (
      (zine.kind='standalone' and zine.owner_user_id=(select auth.uid()))
      or (zine.kind='room' and zine.room_id is not null and (select security.is_room_host(zine.room_id)))
    )
  );
$$;

create function security.can_read_zine_asset(target_object_name text)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.zine_source_photos photo
    join public.zine_sources source on source.id=photo.source_id
    join public.zine_versions version
      on version.source_id=source.id and version.zine_id=source.zine_id
    join public.assets asset on asset.id=photo.asset_id
    where (asset.object_key=target_object_name or asset.thumbnail_object_key=target_object_name)
      and version.status='ready' and version.is_current
      and (select security.can_read_zine(source.zine_id))
  );
$$;

revoke all on function security.can_read_zine(uuid),security.can_manage_zine(uuid),
  security.can_read_zine_asset(text)
  from public,anon,service_role;
grant execute on function security.can_read_zine(uuid),security.can_manage_zine(uuid),
  security.can_read_zine_asset(text)
  to authenticated;

alter table public.zines enable row level security;
alter table public.zines force row level security;
alter table public.zine_sources enable row level security;
alter table public.zine_sources force row level security;
alter table public.zine_source_photos enable row level security;
alter table public.zine_source_photos force row level security;
alter table public.zine_source_texts enable row level security;
alter table public.zine_source_texts force row level security;
alter table public.zine_versions enable row level security;
alter table public.zine_versions force row level security;
alter table public.zine_generation_jobs enable row level security;
alter table public.zine_generation_jobs force row level security;
alter table public.zine_usage_ledger enable row level security;
alter table public.zine_usage_ledger force row level security;
alter table public.zine_uploads enable row level security;
alter table public.zine_uploads force row level security;

revoke all on public.zines,public.zine_sources,public.zine_source_photos,
  public.zine_source_texts,public.zine_versions,public.zine_generation_jobs,
  public.zine_usage_ledger,public.zine_uploads from public,anon,authenticated;
grant select on public.zines,public.zine_sources,public.zine_source_photos,
  public.zine_source_texts,public.zine_versions,public.zine_generation_jobs,
  public.zine_usage_ledger,public.zine_uploads to authenticated;
grant all privileges on public.zines,public.zine_sources,public.zine_source_photos,
  public.zine_source_texts,public.zine_versions,public.zine_generation_jobs,
  public.zine_usage_ledger,public.zine_uploads to service_role;

create policy zines_private_read on public.zines for select to authenticated
using (
  (select security.can_manage_zine(id))
  or (status='ready' and (select security.can_read_zine(id)))
);
create policy zine_sources_manager_read on public.zine_sources for select to authenticated
using ((select security.can_manage_zine(zine_id)));
create policy zine_source_photos_manager_read on public.zine_source_photos for select to authenticated
using (exists(select 1 from public.zine_sources source where source.id=source_id and (select security.can_manage_zine(source.zine_id))));
create policy zine_source_texts_manager_read on public.zine_source_texts for select to authenticated
using (exists(
  select 1 from public.zine_source_photos photo
  join public.zine_sources source on source.id=photo.source_id
  where photo.id=source_photo_id and (select security.can_manage_zine(source.zine_id))
));
create policy zine_versions_private_read on public.zine_versions for select to authenticated
using (
  (select security.can_manage_zine(zine_id))
  or (status='ready' and is_current and (select security.can_read_zine(zine_id)))
);
create policy zine_jobs_manager_read on public.zine_generation_jobs for select to authenticated
using ((select security.can_manage_zine(zine_id)));
create policy zine_usage_manager_read on public.zine_usage_ledger for select to authenticated
using (exists(select 1 from public.zine_generation_jobs job where job.id=job_id and (select security.can_manage_zine(job.zine_id))));
create policy zine_uploads_manager_read on public.zine_uploads for select to authenticated
using ((select security.can_manage_zine(zine_id)));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('zine-media','zine-media',false,2250000,array['image/jpeg'])
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create function security.create_zine_draft(
  requested_kind text,
  requested_room_public_id text,
  requested_title text,
  requested_style text,
  requested_idempotency_key uuid
) returns table(zine_id uuid,public_id text,kind text,status text,created boolean)
language plpgsql security definer set search_path=''
as $$
declare caller_user_id uuid:=(select auth.uid()); caller_actor_id uuid; selected_room_id uuid;
  existing_result jsonb; existing_zine public.zines%rowtype; inserted public.zines%rowtype;
begin
  if caller_user_id is null or coalesce((select (auth.jwt()->>'is_anonymous')::boolean),true) then
    raise exception using errcode='42501',message='permanent_account_required';
  end if;
  if requested_idempotency_key is null or requested_kind not in ('room','standalone')
    or requested_style not in ('quiet-field','living-sequence')
    or char_length(btrim(requested_title)) not between 1 and 80 then
    raise exception using errcode='22023',message='invalid_zine_input';
  end if;
  select actor.id into caller_actor_id from public.actors actor
  where actor.owner_user_id=caller_user_id and actor.is_primary and actor.kind='account' limit 1 for update;
  if caller_actor_id is null then raise exception using errcode='P0002',message='identity_bootstrap_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'eventspace:create-zine:'||caller_actor_id::text||':'||requested_idempotency_key::text,0));
  select receipt.result into existing_result from private.command_receipts receipt
  where receipt.actor_id=caller_actor_id and receipt.command_name='create_zine_draft'
    and receipt.idempotency_key=requested_idempotency_key;
  if existing_result is not null then
    select * into existing_zine from public.zines zine where zine.id=(existing_result->>'zine_id')::uuid;
    return query select existing_zine.id,existing_zine.public_id,existing_zine.kind,existing_zine.status,false; return;
  end if;
  if requested_kind='room' then
    select room.id into selected_room_id from public.rooms room
    where room.public_id=requested_room_public_id
      and room.status in ('freezing','archiving','archived','purge_pending')
      and (select security.is_room_host(room.id));
    if selected_room_id is null then raise exception using errcode='42501',message='ended_room_host_required'; end if;
    select * into existing_zine from public.zines zine
    where zine.room_id=selected_room_id and zine.deleted_at is null limit 1;
  elsif requested_room_public_id is not null then
    raise exception using errcode='22023',message='standalone_room_must_be_empty';
  end if;
  if existing_zine.id is null then
    insert into public.zines(kind,owner_user_id,created_by_actor_id,room_id,title,style)
    values(requested_kind,caller_user_id,caller_actor_id,selected_room_id,btrim(requested_title),requested_style)
    returning * into existing_zine;
    inserted:=existing_zine;
  end if;
  insert into private.command_receipts(actor_id,command_name,idempotency_key,result)
  values(caller_actor_id,'create_zine_draft',requested_idempotency_key,
    pg_catalog.jsonb_build_object('zine_id',existing_zine.id));
  return query select existing_zine.id,existing_zine.public_id,existing_zine.kind,existing_zine.status,(inserted.id is not null);
end;
$$;

create function security.prepare_zine_photo_upload(
  requested_zine_public_id text,
  requested_display_byte_size bigint,
  requested_thumbnail_byte_size bigint,
  requested_placeholder_data_url text,
  requested_image_width integer,
  requested_image_height integer,
  requested_idempotency_key uuid
) returns table(upload_id uuid,asset_id uuid,object_key text,thumbnail_object_key text)
language plpgsql security definer set search_path=''
as $$
declare selected_zine public.zines%rowtype; caller_actor_id uuid; existing public.zine_uploads%rowtype;
  new_asset_id uuid; new_upload_id uuid; display_key text; thumbnail_key text;
begin
  select * into selected_zine from public.zines zine
  where zine.public_id=requested_zine_public_id and zine.kind='standalone'
    and zine.status in ('draft','failed') and (select security.can_manage_zine(zine.id)) for update;
  if selected_zine.id is null then raise exception using errcode='42501',message='standalone_zine_owner_required'; end if;
  if requested_idempotency_key is null or requested_display_byte_size not between 1 and 2250000
    or requested_thumbnail_byte_size not between 1 and 184320
    or requested_placeholder_data_url not like 'data:image/jpeg;base64,%'
    or char_length(requested_placeholder_data_url) not between 32 and 10000
    or requested_image_width not between 1 and 1600 or requested_image_height not between 1 and 1600 then
    raise exception using errcode='22023',message='invalid_zine_image_upload';
  end if;
  select * into existing from public.zine_uploads upload
  where upload.zine_id=selected_zine.id and upload.idempotency_key=requested_idempotency_key;
  if existing.id is not null then
    select asset.object_key,asset.thumbnail_object_key into display_key,thumbnail_key
    from public.assets asset where asset.id=existing.asset_id;
    return query select existing.id,existing.asset_id,display_key,thumbnail_key; return;
  end if;
  if (select count(*) from public.zine_uploads upload where upload.zine_id=selected_zine.id and upload.status<>'deleted')>=48 then
    raise exception using errcode='22023',message='zine_photo_limit_reached';
  end if;
  select actor.id into caller_actor_id from public.actors actor
  where actor.owner_user_id=(select auth.uid()) and actor.is_primary and actor.kind='account' limit 1;
  new_asset_id:=gen_random_uuid(); new_upload_id:=gen_random_uuid();
  display_key:='zines/'||selected_zine.id::text||'/source/'||new_asset_id::text||'/display.jpg';
  thumbnail_key:='zines/'||selected_zine.id::text||'/source/'||new_asset_id::text||'/thumbnail.jpg';
  insert into public.assets(id,owner_actor_id,kind,status,object_key,mime_type,byte_size,
    thumbnail_object_key,thumbnail_byte_size,placeholder_data_url,image_width,image_height)
  values(new_asset_id,caller_actor_id,'image','pending',display_key,'image/jpeg',requested_display_byte_size,
    thumbnail_key,requested_thumbnail_byte_size,requested_placeholder_data_url,requested_image_width,requested_image_height);
  insert into public.zine_uploads(id,zine_id,asset_id,idempotency_key)
  values(new_upload_id,selected_zine.id,new_asset_id,requested_idempotency_key);
  return query select new_upload_id,new_asset_id,display_key,thumbnail_key;
end;
$$;

create function security.finalize_zine_photo_upload(requested_upload_id uuid)
returns table(upload_id uuid,asset_id uuid,status text)
language plpgsql security definer set search_path=''
as $$
declare selected_upload public.zine_uploads%rowtype; selected_asset public.assets%rowtype;
begin
  select upload.* into selected_upload from public.zine_uploads upload
  where upload.id=requested_upload_id and (select security.can_manage_zine(upload.zine_id)) for update;
  if selected_upload.id is null then raise exception using errcode='42501',message='zine_upload_owner_required'; end if;
  select * into selected_asset from public.assets asset where asset.id=selected_upload.asset_id for update;
  if selected_upload.status in ('ready','attached') then
    return query select selected_upload.id,selected_upload.asset_id,selected_upload.status; return;
  end if;
  if selected_upload.status<>'pending'
    or not exists(select 1 from storage.objects object where object.bucket_id='zine-media'
      and object.name=selected_asset.object_key and object.metadata->>'mimetype'='image/jpeg'
      and coalesce(nullif(object.metadata->>'size','')::bigint,-1)=selected_asset.byte_size)
    or not exists(select 1 from storage.objects object where object.bucket_id='zine-media'
      and object.name=selected_asset.thumbnail_object_key and object.metadata->>'mimetype'='image/jpeg'
      and coalesce(nullif(object.metadata->>'size','')::bigint,-1)=selected_asset.thumbnail_byte_size) then
    raise exception using errcode='22023',message='zine_upload_not_found';
  end if;
  update public.assets set status='ready',ready_at=statement_timestamp() where id=selected_asset.id;
  update public.zine_uploads set status='ready',ready_at=statement_timestamp()
    where id=selected_upload.id returning * into selected_upload;
  return query select selected_upload.id,selected_upload.asset_id,selected_upload.status;
end;
$$;

create function security.enqueue_zine_generation(
  requested_zine_public_id text,
  requested_source_id uuid,
  requested_kind text,
  requested_idempotency_key uuid
) returns table(job_id uuid,status text,attempt_count integer,retried boolean)
language plpgsql security definer set search_path=''
as $$
declare selected_zine public.zines%rowtype; selected_source public.zine_sources%rowtype;
  existing public.zine_generation_jobs%rowtype; inserted public.zine_generation_jobs%rowtype;
begin
  select * into selected_zine from public.zines zine
  where zine.public_id=requested_zine_public_id and zine.status<>'deleted'
    and (select security.can_manage_zine(zine.id)) for update;
  if selected_zine.id is null then raise exception using errcode='42501',message='zine_manage_permission_required'; end if;
  select * into selected_source from public.zine_sources source
  where source.id=requested_source_id and source.zine_id=selected_zine.id and source.status='frozen';
  if selected_source.id is null or requested_idempotency_key is null
    or requested_kind not in ('compose','recompose','change-style') then
    raise exception using errcode='22023',message='invalid_zine_generation_request';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'eventspace:zine-job:'||selected_zine.id::text||':'||requested_idempotency_key::text,0));
  select * into existing from public.zine_generation_jobs job
  where job.zine_id=selected_zine.id and job.idempotency_key=requested_idempotency_key for update;
  if existing.id is not null then
    if existing.status='failed' and existing.attempt_count<5 then
      update public.zine_generation_jobs as job set status='queued',stage='preparing-photographs',
        attempt_count=job.attempt_count+1,error_code=null,started_at=null,finished_at=null
      where job.id=existing.id returning job.* into existing;
      update public.zines set status='generating' where id=selected_zine.id;
      return query select existing.id,existing.status,existing.attempt_count,true; return;
    end if;
    return query select existing.id,existing.status,existing.attempt_count,false; return;
  end if;
  insert into public.zine_generation_jobs(zine_id,source_id,requested_by_user_id,idempotency_key,kind)
  values(selected_zine.id,selected_source.id,(select auth.uid()),requested_idempotency_key,requested_kind)
  returning * into inserted;
  update public.zines set status='generating' where id=selected_zine.id;
  return query select inserted.id,inserted.status,inserted.attempt_count,false;
end;
$$;

create function public.create_zine_draft(
  requested_kind text,requested_room_public_id text,requested_title text,
  requested_style text,requested_idempotency_key uuid
)
returns table(zine_id uuid,public_id text,kind text,status text,created boolean)
language sql security invoker set search_path=''
as $$select * from security.create_zine_draft(requested_kind,requested_room_public_id,requested_title,requested_style,requested_idempotency_key);$$;
create function public.prepare_zine_photo_upload(
  requested_zine_public_id text,requested_display_byte_size bigint,
  requested_thumbnail_byte_size bigint,requested_placeholder_data_url text,
  requested_image_width integer,requested_image_height integer,requested_idempotency_key uuid
)
returns table(upload_id uuid,asset_id uuid,object_key text,thumbnail_object_key text)
language sql security invoker set search_path=''
as $$select * from security.prepare_zine_photo_upload(requested_zine_public_id,requested_display_byte_size,requested_thumbnail_byte_size,requested_placeholder_data_url,requested_image_width,requested_image_height,requested_idempotency_key);$$;
create function public.finalize_zine_photo_upload(requested_upload_id uuid)
returns table(upload_id uuid,asset_id uuid,status text)
language sql security invoker set search_path=''
as $$select * from security.finalize_zine_photo_upload(requested_upload_id);$$;
create function public.enqueue_zine_generation(
  requested_zine_public_id text,requested_source_id uuid,
  requested_kind text,requested_idempotency_key uuid
)
returns table(job_id uuid,status text,attempt_count integer,retried boolean)
language sql security invoker set search_path=''
as $$select * from security.enqueue_zine_generation(requested_zine_public_id,requested_source_id,requested_kind,requested_idempotency_key);$$;

revoke all on function security.create_zine_draft(text,text,text,text,uuid),
  security.prepare_zine_photo_upload(text,bigint,bigint,text,integer,integer,uuid),
  security.finalize_zine_photo_upload(uuid),security.enqueue_zine_generation(text,uuid,text,uuid)
  from public,anon,service_role;
grant execute on function security.create_zine_draft(text,text,text,text,uuid),
  security.prepare_zine_photo_upload(text,bigint,bigint,text,integer,integer,uuid),
  security.finalize_zine_photo_upload(uuid),security.enqueue_zine_generation(text,uuid,text,uuid)
  to authenticated;
revoke all on function public.create_zine_draft(text,text,text,text,uuid),
  public.prepare_zine_photo_upload(text,bigint,bigint,text,integer,integer,uuid),
  public.finalize_zine_photo_upload(uuid),public.enqueue_zine_generation(text,uuid,text,uuid)
  from public,anon,service_role;
grant execute on function public.create_zine_draft(text,text,text,text,uuid),
  public.prepare_zine_photo_upload(text,bigint,bigint,text,integer,integer,uuid),
  public.finalize_zine_photo_upload(uuid),public.enqueue_zine_generation(text,uuid,text,uuid)
  to authenticated;

create policy zine_media_insert on storage.objects for insert to authenticated with check(
  bucket_id='zine-media' and exists(
    select 1 from public.zine_uploads upload
    join public.assets asset on asset.id=upload.asset_id
    where (asset.object_key=name or asset.thumbnail_object_key=name)
      and upload.status='pending' and (select security.can_manage_zine(upload.zine_id))
  )
);
create policy zine_media_select on storage.objects for select to authenticated using(
  bucket_id='zine-media' and (
    exists(
      select 1 from public.zine_uploads upload
      join public.assets asset on asset.id=upload.asset_id
      where (asset.object_key=name or asset.thumbnail_object_key=name)
        and (select security.can_manage_zine(upload.zine_id))
    )
    or (select security.can_read_zine_asset(name))
  )
);
create policy zine_media_delete on storage.objects for delete to authenticated using(
  bucket_id='zine-media' and exists(
    select 1 from public.zine_uploads upload
    join public.assets asset on asset.id=upload.asset_id
    join public.zines zine on zine.id=upload.zine_id
    where (asset.object_key=name or asset.thumbnail_object_key=name)
      and zine.status in ('draft','failed') and (select security.can_manage_zine(upload.zine_id))
  )
);

comment on table public.zines is 'Private Room or standalone zine identity; Room books are one-live-book-per-room.';
comment on table public.zine_sources is 'Immutable generation source snapshot header, frozen before a job is queued.';
comment on table public.zine_source_photos is 'Ordered durable photo snapshot metadata; origin references may be removed later.';
comment on table public.zine_versions is 'Immutable rendered layout versions; only one ready version may be current.';
comment on table public.zine_generation_jobs is 'Idempotent durable generation work with safe failed-job retry.';
comment on table public.zine_usage_ledger is 'Provider-request-deduplicated usage and micro-dollar cost ledger.';

insert into private.schema_versions(component,version) values('zine_data_foundation',1)
on conflict(component) do update set version=excluded.version,applied_at=now();
