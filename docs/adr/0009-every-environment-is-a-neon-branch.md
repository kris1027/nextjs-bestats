# Every environment is a Neon branch

There is no `docker-compose.yml` and no local Postgres. Production runs on
Neon's `main`, and each CI run creates a branch of its own and drops it when
the run ends.

Local development and preview deployments once shared a long-lived `dev`
branch. Local work points at `main` now, `dev` has been deleted, and there are
no preview deployments at all. The title of this ADR therefore holds for CI
alone, and what that costs is recorded where it can be read before someone
"fixes" it.
— `docs/adr/0013-local-development-shares-productions-branch.md`

A local Postgres in Docker would be faster and would work on a train. It would
also not be the database we ship on. Neon is reached over its HTTP driver,
which has no interactive transactions — and the standard way to write an
integration test is to open a transaction and roll it back. That pattern works
perfectly against a local Postgres and does not exist against the driver in
production. A suite that is green about code that cannot run is worse than no
suite, so every environment uses the same Postgres over the same driver.

Auth branches with the database rather than sitting beside it. A Neon branch
carries its own `neon_auth` schema, so a CI run signs in against its own
Viewers and drops them with the branch. That is the property that makes
`watch_records.viewer_id` a foreign key at all — and, now that local work
shares `main`, the property that makes a local sign-in a production Viewer.
— `docs/adr/0005-the-viewer-lives-beside-the-domain.md`

## Which branch you are on is a file

`neon.ts` declares which services every branch carries, so `auth: true` is in
the repository and arrives in a pull request. `.neon` records which branch this
workspace points at, is git-ignored, and is written by `neon checkout <branch>`
— which also pulls that branch's `DATABASE_URL` and `NEON_AUTH_*` into
`.env.local`.

So the environment variables in `.env.example` are not filled in by hand. They
are a list of what `neon checkout` writes, and the one exception —
`NEON_AUTH_COOKIE_SECRET` — is marked as ours.

Migrations are applied by running `pnpm db:migrate` deliberately, against a
connection string chosen on purpose. They are not run from Vercel's build
command: a preview build would migrate whichever branch it points at, parallel
builds would race for the migrations table, and a bad migration would take the
build down rather than one deploy.

### What that rule costs, and `pnpm db:check`

The cost was paid in full: production ran `0000` and `0001` and never `0002`,
so `marking_tallies` did not exist there and every press of a marking control
failed for weeks. Nothing in this repository could have said so. CI creates a
branch and migrates it on every run, so a test asserting the table exists was
green throughout and silent about the one database that mattered.

`pnpm db:check` is the answer that does not weaken the rule. It reads
`drizzle/` and `drizzle.__drizzle_migrations` and names the disagreement, and
it never writes: applying migrations stays something someone does on purpose.
Four findings fail it, because none is fixed by the same thing — a migration
not applied, one timestamped below the newest applied row, one edited after it
ran, and no migrations table at all. A database *ahead* of the build is a note
rather than a failure: it has everything this build needs.

The second of those is worth knowing about on its own. `migrate()` compares
each migration against the newest `created_at` in the table and nothing else,
so one stamped below that is skipped on every run — silently, exiting 0. A
hand-written `drizzle-kit generate --custom` migration is where that can
happen, and this repository has two of them.

Running it against production means pointing `DATABASE_URL` at production
deliberately, which is the same gesture `db:migrate` already asks for. CI still
never does either: it has its own branch, and checking a branch it just created
would only ever be green.

## Sign-in follows the branch too

Managed Better Auth restricts OAuth redirects to a trusted-domain allowlist,
and that list does the work an OAuth proxy would otherwise have done:

- **Localhost is pre-approved**, on any port. Nothing to register.
- **Neon supplies development OAuth credentials**, so sign-in works before a
  Google application exists. Replacing them with our own is on the production
  checklist, not on the path to running the app — one application to register
  now that Google is the only way in, not two.

The list is **per branch**, which follows from auth branching with the data.
With one branch left there is one list, and only production's domain on it.

**Preview deployments were not solved by a wildcard, and this was assumed
before it was checked.** It is why they are now switched off rather than
trusted — `docs/adr/0013`. Neon requires the `*` to be the leftmost subdomain
label — `https://*.example.vercel.app`. Vercel's preview hostnames are
`project-hash-scope.vercel.app`: one label under `vercel.app`, with no
subdomain to replace. The only matching pattern would be `https://*.vercel.app`,
which trusts every application Vercel hosts. So a preview that needs sign-in
has its URL added by hand, and previews that only need the public pages need
nothing.

The failure mode to recognise: a domain that is not on the list fails with
`invalid domain`, which reads as a bug in sign-in rather than as a missing
entry.

```
neon neon-auth domain add https://example.com --branch main
neon neon-auth domain list --branch main
```

## Consequences

Tests need a network. The integration project cannot run on a plane, and a Neon
outage is a red build.

CI never points at production; it has an ephemeral branch of its own, which is
why its tests are free to insert Viewers and cascade deletes. Run locally, that
same suite is pointed at production — deliberately, and at a cost written down
in `docs/adr/0013`.

The trusted-domain list is not in this repository. It is the one piece of
configuration a reader cannot find by reading the code, which is why it is
written down here.
