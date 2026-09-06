# Every environment is a Neon branch, and one OAuth app serves all of them

There is no `docker-compose.yml`, no local Postgres, and no dev-only OAuth
application. Both absences look like oversights and neither is, so they are
written down here before someone helpfully corrects them.

## Every environment is a Neon branch

Production runs on Neon's `main`. Local development and preview deployments
share a long-lived `dev` branch. Each CI run creates its own branch and drops
it when the run ends.

A local Postgres in Docker would be faster and would work on a train. It would
also not be the database we ship on. Neon is reached over its HTTP driver,
which has no interactive transactions — and the standard way to write an
integration test is to open a transaction and roll it back. That pattern works
perfectly against a local Postgres and does not exist against the driver in
production. A suite that is green about code that cannot run is worse than no
suite, so every environment uses the same Postgres over the same driver.

Migrations are applied by running `pnpm db:migrate` deliberately, against a
connection string chosen on purpose. They are not run from Vercel's build
command: a preview build would migrate whichever branch it points at, parallel
builds would race for the migrations table, and a bad migration would take the
build down rather than one deploy.

## One OAuth app serves all of them

Google and GitHub each have exactly one application, and its only registered
redirect is on the production domain. Better Auth's `oAuthProxy` plugin points
every environment's `redirect_uri` there, so signing in from `localhost:3000`
sends you to a callback on production and back again.

This is the part that reads as a misconfiguration. It is not. Preview
deployments get a new URL on every push, and neither provider accepts a
wildcard redirect, so the choice is one app plus a proxy or previews where
nobody can sign in. Production performs the token exchange and fetches the
profile, then hands the encrypted result back to whichever environment started
the flow; it writes nothing to the production database. A local sign-in creates
its session in the local database, as it should.

## Consequences

Tests need a network. The integration project cannot run on a plane, and a Neon
outage is a red build.

`OAUTH_PROXY_SECRET` must be byte-identical in every environment or the
encrypted profile cannot be decrypted on the way back, and the failure it
produces reads as a decryption error rather than as a configuration one.

Production credentials exist in exactly one place. CI never points at
production; it has an ephemeral branch of its own, which is why its tests are
free to insert rows and cascade deletes.
