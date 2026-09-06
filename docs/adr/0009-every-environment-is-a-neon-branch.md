# Every environment is a Neon branch

There is no `docker-compose.yml` and no local Postgres. Production runs on
Neon's `main`, local development and preview deployments share a long-lived
`dev` branch, and each CI run creates a branch of its own and drops it when the
run ends.

A local Postgres in Docker would be faster and would work on a train. It would
also not be the database we ship on. Neon is reached over its HTTP driver,
which has no interactive transactions — and the standard way to write an
integration test is to open a transaction and roll it back. That pattern works
perfectly against a local Postgres and does not exist against the driver in
production. A suite that is green about code that cannot run is worse than no
suite, so every environment uses the same Postgres over the same driver.

Auth branches with the database rather than sitting beside it. A Neon branch
carries its own `neon_auth` schema, so a CI run signs in against its own
Viewers and drops them with the branch, and `dev` cannot reach production's.
That is the property that makes `watch_records.viewer_id` a foreign key at all.
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

## Sign-in follows the branch too

Managed Better Auth restricts OAuth redirects to a trusted-domain allowlist,
and that list does the work an OAuth proxy would otherwise have done:

- **Localhost is pre-approved**, on any port. Nothing to register.
- **Neon supplies development OAuth credentials**, so sign-in works before a
  Google or GitHub application exists. Replacing them with our own is on the
  production checklist, not on the path to running the app.

The list is **per branch**, which follows from auth branching with the data:
production's domain is trusted on `main`, and a preview's is trusted on `dev`.
Adding one to the branch you happen to have checked out is the easy mistake.

**Preview deployments are not solved by a wildcard, and this was assumed
before it was checked.** Neon requires the `*` to be the leftmost subdomain
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
why its tests are free to insert Viewers and cascade deletes.

The trusted-domain list is not in this repository. It is the one piece of
configuration a reader cannot find by reading the code, which is why it is
written down here.
