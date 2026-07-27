-- Cover the nullable actor foreign key used by room lifecycle writes.
create index rooms_ended_by_actor_id_idx
  on public.rooms (ended_by_actor_id)
  where ended_by_actor_id is not null;
