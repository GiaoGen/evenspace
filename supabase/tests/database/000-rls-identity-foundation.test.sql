begin;

set local statement_timeout = '15s';
set local lock_timeout = '5s';

create extension if not exists pgtap with schema extensions;

select extensions.plan(9);

create table public.be008_rls_probe (
  id bigint generated always as identity primary key,
  owner_id uuid not null,
  body text not null
);

alter table public.be008_rls_probe enable row level security;
alter table public.be008_rls_probe force row level security;

revoke all on table public.be008_rls_probe from public, anon, authenticated;
grant select on table public.be008_rls_probe to anon, authenticated, service_role;

create index be008_rls_probe_owner_id_idx
  on public.be008_rls_probe (owner_id);

create policy "permanent accounts can read their own probe rows"
on public.be008_rls_probe
for select
to authenticated
using (
  (select auth.uid()) = owner_id
  and coalesce(
    (select (auth.jwt() ->> 'is_anonymous')::boolean),
    true
  ) = false
);

insert into public.be008_rls_probe (owner_id, body)
values
  ('11111111-1111-4111-8111-111111111111', 'permanent owner row'),
  ('22222222-2222-4222-8222-222222222222', 'other owner row');

select extensions.ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'anon cannot use the private schema'
);

select extensions.ok(
  not has_schema_privilege('authenticated', 'private', 'usage'),
  'authenticated cannot use the private schema'
);

select extensions.ok(
  not has_table_privilege('anon', 'private.schema_versions', 'select'),
  'anon cannot select the private migration marker'
);

select extensions.ok(
  not has_table_privilege(
    'authenticated',
    'private.schema_versions',
    'select'
  ),
  'authenticated cannot select the private migration marker'
);

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select extensions.results_eq(
  'select count(*) from public.be008_rls_probe',
  array[0::bigint],
  'an unauthenticated request sees no probe rows'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select extensions.results_eq(
  'select count(*) from public.be008_rls_probe',
  array[0::bigint],
  'an anonymous authenticated user sees no permanent-account rows'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select extensions.results_eq(
  'select count(*) from public.be008_rls_probe',
  array[1::bigint],
  'a permanent authenticated user sees exactly their own row'
);

select extensions.results_eq(
  'select body from public.be008_rls_probe order by id',
  array['permanent owner row'::text],
  'a permanent authenticated user cannot read another owner row'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);
set local role service_role;

select extensions.results_eq(
  'select count(*) from public.be008_rls_probe',
  array[2::bigint],
  'the admin service role can read all probe rows'
);

reset role;

select * from extensions.finish();

rollback;
