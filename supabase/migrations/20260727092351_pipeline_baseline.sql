create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

alter default privileges in schema private
  revoke all on tables from public, anon, authenticated;

alter default privileges in schema private
  revoke all on sequences from public, anon, authenticated;

alter default privileges in schema private
  revoke all on functions from public, anon, authenticated;

create table if not exists private.schema_versions (
  component text primary key,
  version integer not null,
  applied_at timestamptz not null default now(),
  constraint schema_versions_component_not_empty
    check (length(btrim(component)) > 0),
  constraint schema_versions_version_positive
    check (version > 0)
);

alter table private.schema_versions enable row level security;
alter table private.schema_versions force row level security;

revoke all on table private.schema_versions from public;
revoke all on table private.schema_versions from anon;
revoke all on table private.schema_versions from authenticated;

comment on schema private is
  'Non-Data-API schema for EventSpace backend implementation details.';

comment on table private.schema_versions is
  'Version markers used to verify the migration and type-generation pipeline.';

insert into private.schema_versions (component, version)
values ('migration_pipeline', 1)
on conflict (component) do update
set
  version = excluded.version,
  applied_at = now();
