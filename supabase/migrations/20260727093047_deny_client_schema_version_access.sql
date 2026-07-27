drop policy if exists schema_versions_no_client_access
on private.schema_versions;

create policy schema_versions_no_client_access
on private.schema_versions
for all
to anon, authenticated
using (false)
with check (false);
