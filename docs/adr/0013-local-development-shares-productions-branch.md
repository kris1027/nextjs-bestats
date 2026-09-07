# Local development shares production's branch

There is no `dev` branch any more. `.env.local` points at `main`, which is
production, and so does the app running on localhost. CI is unchanged: it still
creates a branch per run and drops it at the end.

This reverses half of `docs/adr/0009`, which had local development and preview
deployments sharing a long-lived `dev`. Previews are gone entirely — see the
consequences below. The reason for the rest is that `dev` bought separation
nobody was using: BeStats has one developer, and the Viewer and the Watch
Records on `dev` were the same person's as the ones on `main`, entered twice.
Two branches, two sets of credentials, and a `neon checkout` to remember before
every session, to keep apart data that was never actually different.

**What this costs is real and is accepted deliberately.** It is written down
here so that nobody reading `.env.local` later assumes it is a misconfiguration
and "fixes" it.

## The integration suite writes to production

`pnpm test:integration` inserts Viewers into `neon_auth."user"` and Watch
Records beside them, then deletes them — see `lib/test-viewers.ts`. Pointed at
`main`, that is production it is inserting into and deleting from. The suite
only removes ids it created, so a normal run leaves nothing behind, but a test
that grows a broader `delete` reaches real rows rather than a scratch branch's.

`pnpm pre-commit` runs the unit project alone, so committing is unaffected.
`pnpm test` runs both, and is therefore no longer a safe thing to run without
thinking about it.

The alternative — keeping `dev` solely for the suite — was considered and turned
down: it keeps both branches, which is most of what removing `dev` was for.

## Signing in locally makes a real Viewer

Localhost is a trusted origin on every branch, so sign-in works as before. The
Viewer it creates is now a row in production's `neon_auth`, and marking
something while developing writes a Watch Record that the deployed app will
show. For one developer and no other Viewers this is closer to convenient than
to dangerous, and it stops being either the moment somebody else signs in.

## Consequences

**There are no preview deployments.** They had `dev`, and rather than point
them at `main` they were turned off — `vercel.json`'s `ignoreCommand` builds
only `VERCEL_ENV=production`. Sharing production locally is one thing; a
preview URL is openable by anyone holding the link, and it would have been
reading and writing the live database. A pull request is still checked by CI,
which has a branch of its own; what it no longer gets is a URL to click.

**`db:check` needs care again.** Running it with no override checks `main`,
which is production, and that is now the useful default rather than a mistake.
The host in its output is the way to tell — there is only one host left to see.

**Going back is cheap, and the data is not.** Recreating a `dev` branch is one
command; what would not come back is anything a careless test run had deleted
from `main` in the meantime. That asymmetry is the whole reason this file
exists.
