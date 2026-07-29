create index profiles_avatar_asset_id_idx
  on public.profiles (avatar_asset_id);

create index room_members_avatar_asset_id_idx
  on public.room_members (avatar_asset_id);

create index room_join_requests_avatar_asset_id_idx
  on private.room_join_requests (avatar_asset_id);
