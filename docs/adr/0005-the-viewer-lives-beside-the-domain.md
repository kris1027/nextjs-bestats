# The Viewer lives beside the domain

A Viewer is a row in our own Postgres, so `watch_records.viewer_id` is a real
foreign key and deleting a Viewer cascades to their Watch Records because the
database says so. That was the requirement. Neon's Managed Better Auth meets
it: it keeps `user`, `session` and `account` in the `neon_auth` schema of the
same database the app already has, on the same branch, branching with it.

The alternative that shapes everything else was a hosted identity service whose
users live somewhere we cannot join to — Clerk, Auth0 and the like. The Viewer's
id would then be a string arriving from elsewhere that our schema could only
hope still refers to someone, account deletion would be a webhook we have to
catch rather than a constraint we declare, and the one relationship v1 exists to
model would be the one relationship the database could not enforce.
`docs/adr/0003` split the domain off from the TMDB client so these records would
have "a home that is not named after a third-party API"; putting the Viewer in a
second third-party API would have missed the point twice.

Google and GitHub are the only ways in. Neither email delivery, verification,
reset flows nor password hashing exists in v1, because sign-in is not the
interesting part of this app.

## Considered and rejected: running Better Auth ourselves

This was the first decision, and it was reversed before it shipped. Running
`better-auth` directly gives us the current version, the plugin system, and an
auth configuration that lives in the repository and arrives in a pull request.
Against that, it needs an OAuth application per provider registered by hand, a
proxy plugin and a shared secret to make preview deployments work at all, and
its own copy of the four auth tables in our migrations.

Managed Better Auth removes most of that. Localhost is a trusted origin
already, and Neon supplies development OAuth credentials, so sign-in works
before any provider account exists. Preview deployments are the part it does
not fix — see `docs/adr/0009` — but they were never going to work under the
proxy either.

What it costs is worth naming, because none of it is visible in the code:

- **The version is Neon's.** `neon_auth.account` has no `issuer` column, which
  the current Better Auth has. We upgrade when Neon upgrades.
- **The configuration is Neon's.** Trusted domains and social providers live in
  a `project_config` row, reached through the console or the CLI, not through a
  file in this repository. `neon.ts` declares *that* auth exists; it does not
  declare how it is configured.
- **It is Beta**, and the SDK is a `0.x` release.
- **Leaving Neon stops being a connection string.** Self-hosted, the database
  is portable and the auth goes with it. This way, moving means migrating
  Viewer rows and rewriting `lib/auth.ts`.

## Consequences

Better Auth's tables keep the names Neon gives them, in the schema Neon gives
them. `CONTEXT.md` grants a vendor's vocabulary the same licence it already
grants TMDB's `tv`: the word stays as the vendor spells it, and the glossary's
word is what the reader sees.

That licence is bounded the way `docs/adr/0003` bounds TMDB's. `lib/auth.ts`
owns the Neon Auth instance and exports `viewer()`; `app/` and `components/`
read the current Viewer through it and never reach for a session themselves. So
`user` appears in one module, and `viewer_id` — our column, on our table — is
the seam where the vendor's word stops and the glossary's begins, exactly as
`MediaItem.id` is the seam that holds a TMDB id.

That boundary is why this reversal cost one module rather than the application.
The pages, the header and the sign-in form did not change when the vendor
underneath them did.

`neon_auth.user.id` is a `uuid`, so `watch_records.viewer_id` is a `uuid` too —
not the `text` a self-hosted Better Auth would have given it.

Neon owns every table in `neon_auth`, so `drizzle.config.ts` narrows generation
to `public` and `lib/schema.ts` does not declare them. A Drizzle `references()`
across that line makes drizzle-kit try to *create* the table it is pointing at,
so the foreign key is written by hand in
`drizzle/0001_viewer_foreign_key.sql` instead. It was the first migration in
this repository not to be generated, and it says so; every later table that
belongs to a Viewer gets its foreign key the same way.
