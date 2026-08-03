create index if not exists zine_draft_photos_room_photo_idx on public.zine_draft_photos(room_photo_id)
  where room_photo_id is not null;
create index if not exists zine_draft_photos_upload_idx on public.zine_draft_photos(upload_id)
  where upload_id is not null;
create index if not exists zine_draft_photos_comment_idx on public.zine_draft_photos(comment_id)
  where comment_id is not null;
