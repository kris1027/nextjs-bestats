# The Viewer lives beside the domain

A Viewer is a row in our own Postgres, put there by Better Auth's Drizzle
adapter, rather than a record held by an identity service we ask about over
HTTP. `watch_records.viewer_id` is therefore a real foreign key, and deleting
a Viewer cascades to their Watch Records because the database says so.

The alternative was a hosted identity service — Clerk, Auth0 and the like.
Either would have been less to write. But the Viewer's id would then be a
string arriving from elsewhere that our schema could only hope still refers to
someone, account deletion would be a webhook we have to catch rather than a
constraint we declare, and the one relationship v1 exists to model would be the
one relationship the database could not enforce. `docs/adr/0003` split the
domain off from the TMDB client so these records would have "a home that is not
named after a third-party API"; putting the Viewer in a second third-party API
would have missed the point twice.

Google and GitHub are the only ways in. Neither email delivery, verification,
reset flows nor password hashing exists in v1, because sign-in is not the
interesting part of this app.

## Consequences

Better Auth's tables keep the names it gives them — `user`, `session`,
`account`, `verification` — and its session keeps the shape it gives it, so
`session.user.id` is what the library hands back. `CONTEXT.md` grants a
vendor's vocabulary the same licence it already grants TMDB's `tv`: the word
stays as the vendor spells it, and the glossary's word is what the reader sees.

That licence is bounded the way `docs/adr/0003` bounds TMDB's. `lib/auth.ts`
owns the Better Auth instance and exports `viewer()`; `app/` and `components/`
read the current Viewer through it and never reach for a session themselves.
So `user` appears in one module, and `viewer_id` — our column, on our table —
is the seam where the vendor's word stops and the glossary's begins, exactly as
`MediaItem.id` is the seam that holds a TMDB id.

Renaming those tables was possible and rejected. Better Auth's `modelName`
remaps the database but not the types: the table would read `viewer` while
every line of code we write still said `session.user.id`. A rename that
reaches half the layers leaves two vocabularies where there had been one.
