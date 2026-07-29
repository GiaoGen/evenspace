create or replace function security.finalize_profile_avatar_upload(
  requested_asset_id uuid
)
returns table (asset_id uuid, object_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_asset public.assets%rowtype;
  previous_avatar_asset_id uuid;
  selected_avatar_variant text;
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
    raise exception using
      errcode = '42501',
      message = 'avatar_asset_owner_required';
  end if;

  if selected_asset.status = 'pending' then
    if not exists (
      select 1
      from storage.objects object
      where object.bucket_id = 'room-media'
        and object.name = selected_asset.object_key
    ) then
      raise exception using
        errcode = '22023',
        message = 'avatar_upload_not_found';
    end if;

    update public.assets
    set status = 'ready', ready_at = statement_timestamp()
    where id = selected_asset.id
    returning * into selected_asset;
  elsif selected_asset.status <> 'ready' then
    raise exception using
      errcode = '22023',
      message = 'avatar_asset_not_ready';
  end if;

  select profile.avatar_asset_id, profile.avatar_variant
  into previous_avatar_asset_id, selected_avatar_variant
  from public.profiles profile
  where profile.user_id = (select auth.uid())
  for update;

  if selected_avatar_variant is null then
    raise exception using
      errcode = 'P0002',
      message = 'profile_required';
  end if;

  update public.profiles
  set avatar_asset_id = selected_asset.id
  where user_id = (select auth.uid());

  update public.room_members membership
  set
    avatar_asset_id = selected_asset.id,
    avatar_variant = selected_avatar_variant
  where membership.actor_id = selected_asset.owner_actor_id
    and (
      membership.avatar_asset_id = previous_avatar_asset_id
      or (
        membership.avatar_asset_id is null
        and membership.avatar_variant = selected_avatar_variant
      )
    );

  return query select selected_asset.id, selected_asset.object_key;
end;
$$;

create or replace function private.copy_pending_join_avatar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_variant text;
  selected_asset_id uuid;
begin
  if new.role = 'member' then
    select request.avatar_variant, request.avatar_asset_id
    into selected_variant, selected_asset_id
    from private.room_join_requests request
    where request.room_id = new.room_id
      and request.actor_id = new.actor_id
      and request.status = 'pending'
    order by request.requested_at desc
    limit 1;

    if selected_variant is not null then
      new.avatar_variant := selected_variant;
      new.avatar_asset_id := selected_asset_id;
      return new;
    end if;
  end if;

  if new.avatar_asset_id is null then
    select profile.avatar_variant, profile.avatar_asset_id
    into selected_variant, selected_asset_id
    from public.actors actor
    join public.profiles profile on profile.user_id = actor.owner_user_id
    join public.assets asset on asset.id = profile.avatar_asset_id
    where actor.id = new.actor_id
      and actor.is_primary
      and actor.kind = 'account'
      and asset.kind = 'image'
      and asset.status = 'ready';

    if selected_asset_id is not null then
      new.avatar_variant := selected_variant;
      new.avatar_asset_id := selected_asset_id;
    end if;
  end if;

  return new;
end;
$$;

update public.room_members membership
set
  avatar_asset_id = profile.avatar_asset_id,
  avatar_variant = profile.avatar_variant
from public.actors actor
join public.profiles profile on profile.user_id = actor.owner_user_id
join public.assets asset on asset.id = profile.avatar_asset_id
where membership.actor_id = actor.id
  and actor.is_primary
  and actor.kind = 'account'
  and membership.avatar_asset_id is null
  and membership.avatar_variant = profile.avatar_variant
  and asset.kind = 'image'
  and asset.status = 'ready';

insert into private.schema_versions (component, version)
values ('profile_avatar_room_sync', 1)
on conflict (component) do update
set version = excluded.version, applied_at = now();
