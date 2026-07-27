# Supabase Cloud Development

EventSpace uses a cloud-first Supabase workflow. Docker, WSL, and a local
Supabase stack are optional and are not prerequisites for backend integration.

Supabase CLI agent auto-detection currently forces JSON/non-interactive
behavior in this Codex environment. Every repository command therefore passes
`--agent no` explicitly. Omitting it from interactive commands such as `login`
can produce `NonInteractiveError`.

## Environment strategy

- `eventspace-dev`: the cloud development project used while building and
  testing migrations, Auth, RLS, Storage, and Realtime.
- `eventspace-prod`: a separate production project created before launch.
- Production data and secrets must never be copied into the development
  project.

The repository keeps a project-scoped, exactly pinned Supabase CLI so schema
changes remain reproducible. `supabase/config.toml`, migrations, and generated
database types are committed; credentials and CLI link state are not.

## Initial cloud connection

```powershell
npm install
npm run supabase:login
npm run supabase:link -- --project-ref <eventspace-dev-project-ref>
Copy-Item .env.example .env.local
```

Fill `.env.local` with the cloud project URL, its active publishable key, and a
server-only secret key. Never commit `.env.local`, database passwords, access
tokens, secret keys, or service-role credentials.

The public URL and publishable key are validated when Next.js loads
`next.config.ts`. Invalid or missing public values stop `dev`, `build`, and
`start` before the application runs. `SUPABASE_SECRET_KEY` is optional until a
server-only admin capability is enabled; if configured, it must use the modern
`sb_secret_` format, and the admin accessor always requires it.

The Supabase clients consume these variables through explicit browser,
request-scoped server, and server-only admin boundaries. Existing Mock UI and
data flows remain unchanged until a corresponding backend slice is verified.

## Migration workflow

Every schema change must exist as a reviewed migration in `supabase/migrations`.
Dashboard-only schema changes are not allowed.

```powershell
npm run supabase:migration:new -- <snake_case_change_name>
npm run supabase:migrations
npm run supabase:push:check
npm run supabase:push
npm run supabase:diff:check
npm run supabase:types
npm run supabase:types:check
```

The required order is:

1. Create the empty file through `supabase:migration:new`; do not invent a
   timestamp.
2. Write and review SQL using lowercase snake_case identifiers, explicit
   constraints, least privilege, and RLS for every exposed table.
3. Compare local and remote history with `supabase:migrations`.
4. Review `supabase:push:check`; only then run `supabase:push` against
   `eventspace-dev`.
5. Run `supabase:diff:check` and regenerate the committed public Data API types.
6. Run the application test, typecheck, lint, and production build checks.

`data/supabase/database.types.ts` intentionally contains only the `public`
Data API schema. Internal schemas such as `private` are not browser APIs and
must not be added to generated application client types.

Production deployment is a separate, explicitly approved step after tests and
Supabase security/performance advisors pass. Never use `--include-seed` against
production and never run `db reset --linked` against a non-disposable project.

## CI schema verification

`.github/workflows/backend-schema.yml` runs on backend schema pull requests.
Configure these GitHub Actions secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID` for the cloud development project
- `SUPABASE_DB_PASSWORD` for the cloud development project

The workflow links non-interactively, compares migration history, previews
pending migrations, detects schema drift, runs transaction-isolated pgTAP tests
against the cloud development database, and proves generated TypeScript types
match the cloud development schema. It never pushes migrations.

## Cloud database tests

Database integration tests live in `supabase/tests/database` and run directly
against the linked `eventspace-dev` project:

```powershell
npm run supabase:test:db
```

The tests use pgTAP, deterministic fixture UUIDs, JWT claim simulation, and
Postgres roles to cover unauthenticated, anonymous-authenticated,
permanent-authenticated, and server-only admin access. They do not create real
Auth users or send email.

Each test owns a short transaction and ends with `rollback`. Fixtures, policies,
probe tables, role changes, and JWT settings therefore disappear after both
successful runs and connection-closing failures. Never use `db reset --linked`
as a test cleanup mechanism.

## Core business schema v1

The linked development project now contains the first production business
boundary:

- `profiles`: private account preferences keyed by `auth.users.id`.
- `actors`: stable guest/account content identities.
- `rooms`: host-led room lifecycle and limits.
- `room_members`: room-scoped host/member roles and access state.

All four tables explicitly enable and force RLS. The unauthenticated `anon`
role has no table privileges. Authenticated clients can read only the rows
allowed by membership policies and can write only their own limited profile
columns. They cannot directly insert or mutate actors, rooms, or memberships;
identity bootstrap and room creation now run through transactional RPC
commands.

RLS membership lookups use narrowly scoped functions in the non-exposed
`security` schema. These functions use an empty `search_path`, re-check
`auth.uid()`, and expose execution only to `authenticated`.

The schema intentionally does not replace `MockSession` or the current UI data
source yet. It also postpones asset foreign keys until the Storage/assets
migration exists, avoiding unvalidated UUID references.

## Identity and room command boundary

`public.bootstrap_identity` idempotently establishes the current Auth user's
profile and stable primary actor. Anonymous Auth users begin with a guest actor;
when the same Auth identity becomes permanent, the actor is upgraded in place
so future content foreign keys do not need to change.

`public.create_host_led_room` accepts only editable room fields and a
caller-generated UUID idempotency key. Its privileged implementation derives
the account actor from verified JWT claims and atomically creates the room plus
its Host membership. Mode, role, lifecycle state, timestamps, revision, and
public ID remain database-controlled.

Both public functions are security-invoker wrappers available only to the
`authenticated` role. Their narrowly scoped implementations live in the
non-exposed `security` schema, use an empty `search_path`, and complete in short
transactions. Retry receipts live in `private.command_receipts`, which has no
client table grants, forces RLS, and carries a restrictive deny-all policy.

Next.js calls these RPCs only through
`data/supabase/room-commands.ts`. That server-only module validates input,
returns generated Database types, and maps database/provider details to stable
application error codes. No current page or Mock data source imports it yet.

## Room read models

`public.list_current_user_rooms` and `public.get_current_user_room` return only
rooms readable by the current primary actor. They include the caller's
membership and an authoritative count of active/muted members without exposing
other private membership rows.

The list uses `(updated_at, room_id)` keyset pagination rather than offsets.
Both read APIs enforce the same active/archive and anonymous-account boundaries
as room RLS, use security-invoker public wrappers, and keep their narrowly
scoped privileged implementations in the non-exposed `security` schema.

Next.js accesses these APIs through the server-only
`SupabaseRoomReadRepository`. The current UI still uses Mock data until a
separate page integration task can provide deliberate loading, empty,
authentication, and failure states without changing the established visual
design.

On this Windows machine the Supabase Management API and connector work, but a
direct TLS connection to `db.<project-ref>.supabase.co:5432` may end with EOF.
When that occurs, do not retry in a loop: use the official connector to apply
and verify the reviewed development migration, then let CI run the direct
history/dry-run/drift checks from its Linux runner.

## Secret boundary

- `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be used by browser code.
- `SUPABASE_SECRET_KEY` is server-only and must never be imported by a Client
  Component or exposed through a `NEXT_PUBLIC_` variable.
- Supabase CLI-generated `.temp`, `.branches`, and local dotenv variants under
  `supabase/` remain ignored.
