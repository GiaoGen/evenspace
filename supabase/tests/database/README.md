# Database integration tests

These pgTAP tests run against the linked `eventspace-dev` cloud database. They
do not require a local Supabase stack, Docker, WSL, real Auth users, or email
delivery.

Run them with:

```powershell
npm run supabase:test:db
```

Every test file must:

1. Start with `begin`.
2. Use `set local` for timeouts, roles, and JWT claims.
3. Create only transaction-scoped fixtures with deterministic IDs.
4. Exercise both allowed and denied RLS paths.
5. End with `select * from extensions.finish()` and `rollback`.

The identity foundation uses these database contexts:

- `anon`: no signed-in user.
- `authenticated` with `is_anonymous: true`: a Supabase anonymous Auth user.
- `authenticated` with `is_anonymous: false`: a permanent account.
- `service_role`: the server-only administrative role that bypasses RLS.

Anonymous Auth and unauthenticated requests are intentionally different. RLS
policies must inspect the trusted top-level JWT `is_anonymous` claim when that
difference matters; user-editable metadata must not be used for authorization.

Tests must not create real `auth.users`, call external providers, reset the
linked database, or rely on state from another test file. A failed session
leaves its open transaction to be rolled back by PostgreSQL when the connection
closes.
