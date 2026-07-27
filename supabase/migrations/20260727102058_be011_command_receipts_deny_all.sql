create policy command_receipts_deny_all
on private.command_receipts
as restrictive
for all
to public
using (false)
with check (false);

comment on policy command_receipts_deny_all
on private.command_receipts is
  'Defense in depth: command receipts are accessible only through privileged command implementations.';
