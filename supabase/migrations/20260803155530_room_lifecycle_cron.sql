-- Keep room end-state authoritative for both Rooms and the in-room Book entry.
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function security.advance_room_lifecycle(requested_limit integer default 100)
returns table (room_id uuid, previous_status text, next_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  next_value text;
  now_at timestamptz := statement_timestamp();
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if requested_limit is null or requested_limit not between 1 and 500 then
    raise exception using errcode = '22023', message = 'invalid_limit';
  end if;

  for item in
    select room.id, room.status
    from public.rooms as room
    where (room.status = 'active' and room.ends_at <= now_at)
       or room.status in ('freezing', 'archiving')
    order by room.ends_at, room.id
    for update skip locked
    limit requested_limit
  loop
    next_value := case item.status
      when 'active' then 'freezing'
      when 'freezing' then 'archiving'
      when 'archiving' then 'archived'
    end;

    update public.rooms as room
    set status = next_value,
        ended_at = case when item.status = 'active' then coalesce(room.ended_at, now_at) else room.ended_at end,
        end_reason = case when item.status = 'active' then coalesce(room.end_reason, 'expired') else room.end_reason end,
        archive_started_at = case when next_value = 'archiving' then coalesce(room.archive_started_at, now_at) else room.archive_started_at end,
        archived_at = case when next_value = 'archived' then coalesce(room.archived_at, now_at) else room.archived_at end,
        purge_after = case when next_value = 'archived' then coalesce(room.purge_after, now_at + interval '30 days') else room.purge_after end,
        revision = room.revision + 1
    where room.id = item.id;

    if next_value = 'archived' then
      update public.room_members as member
      set archive_eligible = true
      where member.room_id = item.id
        and member.state in ('active', 'muted');
    end if;

    return query select item.id, item.status, next_value;
  end loop;
end;
$$;

create or replace function security.run_room_lifecycle_maintenance(
  requested_limit integer default 500
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if requested_limit is null or requested_limit not between 1 and 500 then
    raise exception using errcode = '22023', message = 'invalid_limit';
  end if;

  -- Each lifecycle pass advances one authoritative state. Running all three in
  -- one maintenance transaction keeps the state machine intact while making a
  -- completed room available to Book Studio after a single scheduled run.
  perform 1 from security.advance_room_lifecycle(requested_limit);
  perform 1 from security.advance_room_lifecycle(requested_limit);
  perform 1 from security.advance_room_lifecycle(requested_limit);

  delete from cron.job_run_details
  where end_time < statement_timestamp() - interval '30 days';
end;
$$;

revoke all on function security.run_room_lifecycle_maintenance(integer)
from public, anon, authenticated, service_role;
grant execute on function security.run_room_lifecycle_maintenance(integer)
to postgres;

select cron.schedule(
  'eventspace-room-lifecycle',
  '* * * * *',
  'select security.run_room_lifecycle_maintenance(500)'
);

-- Repair rooms whose end time passed before the scheduler was installed.
select security.run_room_lifecycle_maintenance(500);

insert into private.schema_versions(component, version)
values ('room_lifecycle_scheduler', 1)
on conflict (component) do update
set version = excluded.version,
    applied_at = now();
