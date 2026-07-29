alter table public.profiles
  add column avatar_variant text not null default 'initials',
  add column avatar_asset_id uuid references public.assets(id) on delete set null,
  add constraint profiles_avatar_variant_valid
    check (avatar_variant in ('initials', 'single', 'ring'));

alter table public.room_members
  add column avatar_variant text not null default 'initials',
  add column avatar_asset_id uuid references public.assets(id) on delete set null,
  add constraint room_members_avatar_variant_valid
    check (avatar_variant in ('initials', 'single', 'ring'));

alter table private.room_join_requests
  add column avatar_variant text not null default 'initials',
  add column avatar_asset_id uuid references public.assets(id) on delete set null,
  add constraint room_join_requests_avatar_variant_valid
    check (avatar_variant in ('initials', 'single', 'ring'));

create function security.can_read_avatar_asset(target_asset_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      exists (
        select 1
        from public.assets asset
        join public.actors actor on actor.id = asset.owner_actor_id
        where asset.id = target_asset_id
          and actor.owner_user_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.room_members membership
        where membership.avatar_asset_id = target_asset_id
          and (select security.can_read_room(membership.room_id))
      )
      or exists (
        select 1
        from private.room_join_requests request
        join public.actors actor on actor.id = request.actor_id
        where request.avatar_asset_id = target_asset_id
          and (
            actor.owner_user_id = (select auth.uid())
            or (select security.is_room_host(request.room_id))
          )
      )
    );
$$;

revoke all on function security.can_read_avatar_asset(uuid)
  from public, anon, service_role;
grant execute on function security.can_read_avatar_asset(uuid)
  to authenticated;

drop policy assets_member_read on public.assets;
create policy assets_member_read
on public.assets
for select
to authenticated
using (
  exists (
    select 1
    from public.messages message
    where message.asset_id = assets.id
      and (select security.can_read_room(message.room_id))
  )
  or exists (
    select 1
    from public.photos photo
    where photo.asset_id = assets.id
      and (select security.can_read_room(photo.room_id))
  )
  or exists (
    select 1
    from public.actors actor
    where actor.id = assets.owner_actor_id
      and actor.owner_user_id = (select auth.uid())
  )
  or (select security.can_read_avatar_asset(assets.id))
);

drop policy room_media_select on storage.objects;
create policy room_media_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'room-media'
  and exists (
    select 1
    from public.assets asset
    where asset.object_key = name
      and (
        exists (
          select 1
          from public.actors actor
          where actor.id = asset.owner_actor_id
            and actor.owner_user_id = (select auth.uid())
        )
        or exists (
          select 1
          from public.messages message
          where message.asset_id = asset.id
            and (select security.can_read_room(message.room_id))
        )
        or exists (
          select 1
          from public.photos photo
          where photo.asset_id = asset.id
            and (select security.can_read_room(photo.room_id))
        )
        or (select security.can_read_avatar_asset(asset.id))
      )
  )
);

create function security.prepare_profile_avatar_upload(
  requested_mime_type text,
  requested_byte_size bigint
)
returns table (asset_id uuid, object_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_actor_id uuid;
  new_asset_id uuid;
  new_object_key text;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), true) then
    raise exception using errcode = '42501', message = 'permanent_account_required';
  end if;

  if requested_mime_type not in ('image/jpeg', 'image/png', 'image/webp')
    or requested_byte_size not between 1 and 5242880
  then
    raise exception using errcode = '22023', message = 'invalid_avatar_upload';
  end if;

  select actor.id
  into caller_actor_id
  from public.actors actor
  where actor.owner_user_id = (select auth.uid())
    and actor.is_primary
    and actor.kind = 'account'
  limit 1;

  if caller_actor_id is null then
    raise exception using errcode = 'P0002', message = 'identity_bootstrap_required';
  end if;

  new_asset_id := gen_random_uuid();
  new_object_key := 'avatars/' || caller_actor_id::text || '/' || new_asset_id::text;

  insert into public.assets (
    id,
    owner_actor_id,
    kind,
    status,
    object_key,
    mime_type,
    byte_size
  )
  values (
    new_asset_id,
    caller_actor_id,
    'image',
    'pending',
    new_object_key,
    requested_mime_type,
    requested_byte_size
  );

  return query select new_asset_id, new_object_key;
end;
$$;

create function security.finalize_profile_avatar_upload(
  requested_asset_id uuid
)
returns table (asset_id uuid, object_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_asset public.assets%rowtype;
begin
  select asset.*
  into selected_asset
  from public.assets asset
  join public.actors actor on actor.id = asset.owner_actor_id
  where asset.id = requested_asset_id
    and asset.kind = 'image'
    and actor.owner_user_id = (select auth.uid())
    and actor.is_primary
    and actor.kind = 'account'
  for update of asset;

  if selected_asset.id is null then
    raise exception using errcode = '42501', message = 'avatar_asset_owner_required';
  end if;

  if selected_asset.status = 'pending' then
    if not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'room-media'
        and object.name = selected_asset.object_key
    ) then
      raise exception using errcode = '22023', message = 'avatar_upload_not_found';
    end if;

    update public.assets
    set status = 'ready', ready_at = statement_timestamp()
    where id = selected_asset.id
    returning * into selected_asset;
  elsif selected_asset.status <> 'ready' then
    raise exception using errcode = '22023', message = 'avatar_asset_not_ready';
  end if;

  update public.profiles
  set avatar_asset_id = selected_asset.id
  where user_id = (select auth.uid());

  return query select selected_asset.id, selected_asset.object_key;
end;
$$;

create function public.prepare_profile_avatar_upload(
  requested_mime_type text,
  requested_byte_size bigint
)
returns table (asset_id uuid, object_key text)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.prepare_profile_avatar_upload(
    requested_mime_type,
    requested_byte_size
  );
$$;

create function public.finalize_profile_avatar_upload(
  requested_asset_id uuid
)
returns table (asset_id uuid, object_key text)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.finalize_profile_avatar_upload(requested_asset_id);
$$;

revoke all on function security.prepare_profile_avatar_upload(text, bigint),
  security.finalize_profile_avatar_upload(uuid)
  from public, anon, service_role;
grant execute on function security.prepare_profile_avatar_upload(text, bigint),
  security.finalize_profile_avatar_upload(uuid)
  to authenticated;

revoke all on function public.prepare_profile_avatar_upload(text, bigint),
  public.finalize_profile_avatar_upload(uuid)
  from public, anon, service_role;
grant execute on function public.prepare_profile_avatar_upload(text, bigint),
  public.finalize_profile_avatar_upload(uuid)
  to authenticated;

create function security.join_room_with_profile(
  requested_room_public_id text,
  requested_nickname text,
  requested_note text default '',
  requested_token text default null,
  requested_code text default null,
  requested_avatar_variant text default 'initials',
  requested_avatar_asset_id uuid default null
)
returns table (
  outcome text,
  room_id uuid,
  public_id text,
  actor_id uuid,
  request_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  joined record;
begin
  if requested_avatar_variant not in ('initials', 'single', 'ring') then
    raise exception using errcode = '22023', message = 'invalid_avatar_variant';
  end if;

  select *
  into joined
  from security.join_room_with_invite(
    requested_room_public_id,
    requested_nickname,
    requested_note,
    requested_token,
    requested_code
  );

  if requested_avatar_asset_id is not null
    and not exists (
      select 1
      from public.profiles profile
      join public.assets asset on asset.id = profile.avatar_asset_id
      join public.actors actor on actor.owner_user_id = profile.user_id
      where profile.user_id = (select auth.uid())
        and profile.avatar_asset_id = requested_avatar_asset_id
        and asset.status = 'ready'
        and asset.kind = 'image'
        and actor.id = joined.actor_id
        and actor.is_primary
    )
  then
    raise exception using errcode = '42501', message = 'avatar_asset_owner_required';
  end if;

  if joined.outcome = 'pending' then
    update private.room_join_requests request
    set
      avatar_variant = requested_avatar_variant,
      avatar_asset_id = requested_avatar_asset_id
    where request.id = joined.request_id
      and request.actor_id = joined.actor_id;
  else
    update public.room_members membership
    set
      avatar_variant = requested_avatar_variant,
      avatar_asset_id = requested_avatar_asset_id
    where membership.room_id = joined.room_id
      and membership.actor_id = joined.actor_id;
  end if;

  return query
  select
    joined.outcome::text,
    joined.room_id::uuid,
    joined.public_id::text,
    joined.actor_id::uuid,
    joined.request_id::uuid;
end;
$$;

create function public.join_room_with_profile(
  requested_room_public_id text,
  requested_nickname text,
  requested_note text default '',
  requested_token text default null,
  requested_code text default null,
  requested_avatar_variant text default 'initials',
  requested_avatar_asset_id uuid default null
)
returns table (
  outcome text,
  room_id uuid,
  public_id text,
  actor_id uuid,
  request_id uuid
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.join_room_with_profile(
    requested_room_public_id,
    requested_nickname,
    requested_note,
    requested_token,
    requested_code,
    requested_avatar_variant,
    requested_avatar_asset_id
  );
$$;

revoke all on function security.join_room_with_profile(
  text, text, text, text, text, text, uuid
) from public, anon, service_role;
grant execute on function security.join_room_with_profile(
  text, text, text, text, text, text, uuid
) to authenticated;

revoke all on function public.join_room_with_profile(
  text, text, text, text, text, text, uuid
) from public, anon, service_role;
grant execute on function public.join_room_with_profile(
  text, text, text, text, text, text, uuid
) to authenticated;

create function private.copy_pending_join_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending_variant text;
  pending_asset_id uuid;
begin
  if new.role <> 'member' then
    return new;
  end if;

  select request.avatar_variant, request.avatar_asset_id
  into pending_variant, pending_asset_id
  from private.room_join_requests request
  where request.room_id = new.room_id
    and request.actor_id = new.actor_id
    and request.status = 'pending'
  order by request.requested_at desc
  limit 1;

  if pending_variant is not null then
    new.avatar_variant := pending_variant;
    new.avatar_asset_id := pending_asset_id;
  end if;

  return new;
end;
$$;

revoke all on function private.copy_pending_join_avatar()
  from public, anon, authenticated, service_role;

create trigger room_members_copy_pending_join_avatar
before insert or update of state, nickname
on public.room_members
for each row
execute function private.copy_pending_join_avatar();

create function security.list_pending_join_requests_with_avatar(
  requested_room_public_id text
)
returns table (
  request_id uuid,
  actor_id uuid,
  nickname text,
  note text,
  requested_at timestamptz,
  avatar_variant text,
  avatar_asset_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.id,
    request.actor_id,
    request.nickname,
    request.note,
    request.requested_at,
    request.avatar_variant,
    request.avatar_asset_id
  from private.room_join_requests request
  join public.rooms room on room.id = request.room_id
  where room.public_id = requested_room_public_id
    and request.status = 'pending'
    and (select security.is_room_host(room.id))
  order by request.requested_at, request.id;
$$;

create function public.list_pending_join_requests_with_avatar(
  requested_room_public_id text
)
returns table (
  request_id uuid,
  actor_id uuid,
  nickname text,
  note text,
  requested_at timestamptz,
  avatar_variant text,
  avatar_asset_id uuid
)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.list_pending_join_requests_with_avatar(
    requested_room_public_id
  );
$$;

create function security.get_join_request_status(
  requested_room_public_id text,
  requested_request_id uuid
)
returns table (request_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select request.status
  from private.room_join_requests request
  join public.rooms room on room.id = request.room_id
  join public.actors actor on actor.id = request.actor_id
  where room.public_id = requested_room_public_id
    and request.id = requested_request_id
    and actor.owner_user_id = (select auth.uid());
$$;

create function public.get_join_request_status(
  requested_room_public_id text,
  requested_request_id uuid
)
returns table (request_status text)
language sql
security invoker
set search_path = ''
as $$
  select *
  from security.get_join_request_status(
    requested_room_public_id,
    requested_request_id
  );
$$;

revoke all on function security.list_pending_join_requests_with_avatar(text),
  security.get_join_request_status(text, uuid)
  from public, anon, service_role;
grant execute on function security.list_pending_join_requests_with_avatar(text),
  security.get_join_request_status(text, uuid)
  to authenticated;

revoke all on function public.list_pending_join_requests_with_avatar(text),
  public.get_join_request_status(text, uuid)
  from public, anon, service_role;
grant execute on function public.list_pending_join_requests_with_avatar(text),
  public.get_join_request_status(text, uuid)
  to authenticated;

insert into private.schema_versions (component, version)
values ('room_identity_avatars_and_guest_join', 1)
on conflict (component) do update
set version = excluded.version, applied_at = now();
