create index photos_owner_actor_id_idx on public.photos(owner_actor_id);
create index photo_comments_room_id_idx on public.photo_comments(room_id);
create index photo_comments_actor_id_idx on public.photo_comments(actor_id);
