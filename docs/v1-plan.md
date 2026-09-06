# BeStats v1

The release where BeStats stops being a TMDB browser and becomes yours. A
Viewer signs in and records what they mean to watch and what they have
watched.

`CONTEXT.md` has promised this from the start — "in time, to record what you
have watched" — and `docs/adr/0003` split the domain layer off from the TMDB
client precisely so those records would have "a home that is not named after a
third-party API". v1 is that home.

This file is a plan, not a record of decisions. Steps 0 to 3 have landed, so
for everything they covered `CONTEXT.md`, `docs/adr/` and the code are now the
authority and the sections below defer to them rather than restating them.
Step 4, the control, is next: its Server Action exists, its client half does
not.

## Language

Six terms entered the glossary rather than the three this section originally
drafted: Visitor, Viewer, Watch Record, Planned, Watched and Watchlist.
`CONTEXT.md` is the authority on all of them, and the drafts have been removed
from here so there is only one place to read them.

The two the draft missed were both about naming what already existed. A
Visitor is anyone using BeStats, signed in or not — the word the marking
controls render for, and the word `CONTEXT.md` and `docs/adr/0004` had been
using in lower case all along. Planned and Watched became terms of their own,
standing to a Watch Record as Show and Movie stand to Kind, which also gives
`/watched` a word behind it.

Viewer lost its second sentence. "The word the reader's own watching earns
them" would have excluded a Viewer who has signed in and recorded nothing.

A seventh arrived with step 3: Mark, the glossary's one verb. It was already
load-bearing in two ADRs and this plan before it had a definition, and the
definition is where the rule lives that marking the state a Watch Record
already has unmarks it.

## The invariant

Both halves of this are now recorded as decisions, and the schema that enforces
them shipped in step 1:

- `docs/adr/0007-watchlist-and-watched-are-one-record.md` — one row per Viewer
  per piece of Media, keyed `(viewerId, kind, tmdbId)`, state as a Postgres
  enum, unmarking deletes the row.
- `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md` — no label, no
  poster path, no snapshot.

## Architecture

```
lib/tmdb   TMDB's wire vocabulary                     unchanged
lib/media  the glossary's words, TMDB-shaped          unchanged
lib/auth   Neon Auth's instance, and the Viewer       step 2
lib/watch  Watch Records, from our own database       step 3
```

`lib/media` never learns that Viewers exist. A Media Item stays what the
glossary says it is: enough of a piece of Media to recognise it in a grid.

A page fetches both sources — a TMDB list, and one query for this Viewer's
Watch Records — and hands each card its state as a prop of its own. That is
one database query per page however many cards it holds, and the two sources
fail apart: the database being unreachable does not stop Trending rendering.

## Stack

| Concern    | Choice                        | Why                                                       |
| ---------- | ----------------------------- | --------------------------------------------------------- |
| Host       | Vercel                        | Next 16's reference platform; `next: { revalidate }` relies on its data cache |
| Database   | Neon Postgres                 | scales to zero, HTTP driver suits serverless, branch per preview, real enums |
| ORM        | Drizzle                       | schema is TypeScript, so `tsconfig` strictness reaches it |
| Auth       | Neon's Managed Better Auth    | the Viewer lives in our database, on the same branch, so a Watch Record has a real foreign key |
| Sign-in    | Google and GitHub only        | removes email delivery, verification, reset and hashing from v1 entirely; Neon's development credentials until our own are registered |
| Mutations  | Server Actions + `useOptimistic` | instant on a grid, still a real form, degrades without JS |
| Tests      | Vitest, replacing `node --test` | unit on pre-commit, integration against real Postgres in CI |
| CI         | GitHub Actions                | there is none today                                       |

Production has been live at `nextjs-bestats.vercel.app` since before this plan
was written, and preview deployments run per pull request, so step 7's "Deploy"
was never outstanding. The bill arrives earlier instead: OAuth has to work
across localhost, previews and production from the day it lands, which is half
of `docs/adr/0009-every-environment-is-a-neon-branch.md`.

## Routes

| Route                     | State                                              |
| ------------------------- | -------------------------------------------------- |
| `/`, `/search`, `/[kind]/[id]` | unchanged and public, now carrying marking controls |
| `/watchlist`, `/watched`  | new; paginated at 20, newest first, `?page=` in the address |
| `/sign-in`                | new; Google and GitHub, honours `?next=`           |
| `/settings`               | new; delete account, cascading to Watch Records    |

Every new top-level segment is static, so `docs/adr/0001` holds.

Marking controls render for every Visitor, signed in or not. A Visitor who
never sees the control never learns the app does anything TMDB does not, and
one rendering path for a card is worth more than a hidden one.

A signed-out click goes to `/sign-in?next=…`, which carries a destination and
nothing else — a same-origin relative path, or it is ignored. The Visitor lands
back where they were and clicks again. Replaying the intent through the OAuth
round trip was in the first draft of this plan and was dropped: it is machinery
whose only failure mode is creating a Watch Record nobody asked for, spent to
save one click on a path a Viewer takes once.

Lists paginate at 20 because each item costs a TMDB request. Twenty per page
bounds that cost whatever a Viewer has watched, matches the page size TMDB
uses everywhere else in the app, and lets `formatTally` say "the top 20 of
214 movies" the way it already does for Matches.

## Build order

Steps 0, 1 and 2 share one branch — `feat/viewer-foundation` — because the
schema cannot be written before the tables its foreign key points at. From
step 3 on, each step is its own branch and PR. Steps 1 and 2 are
infrastructure with nothing to see; step 4 is the first one a Visitor would
notice.

**0. Words first.** _Done._ Six terms into `CONTEXT.md`, and its
vendor-vocabulary exception widened to cover Better Auth's `user` alongside
TMDB's `tv`. Five ADRs rather than four — `0009` records the environment
topology, because a redirect URI pointing at production from a laptop reads as
a mistake without it. `CLAUDE.md`'s module boundary gains `lib/auth`, its Tests
section is rewritten for Vitest, its standing rules gain the exclusive-state
invariant, and the paragraph documenting the pre-commit drift is deleted rather
than amended, because step 1 fixes the drift. No code.

**1. Foundation.** _Done._ Migrate `lib/format.test.mts` to Vitest as
`lib/format.test.ts`, with `@/` path aliases working. Split the suite into
unit and integration projects. Add the GitHub Actions workflow — lint,
typecheck, unit, then integration against an ephemeral Neon branch. Reconcile
the pre-commit drift to one definition: `.husky/pre-commit` becomes the single
line `pnpm pre-commit`. Provision Neon, add Drizzle, write the schema and the
first migration — Better Auth's four tables and `watch_records` together, so
the integration project has the invariant itself to test on its first run.

One thing the plan did not foresee: `package.json` gains `"type": "module"`,
without which the Vitest config raises an ESM-in-CJS warning on every run.

The schema this step wrote was replaced in step 2, when the auth decision was
reversed. What survived is the shape — the enums, the triple as the primary
key, the list index — and what changed is that `viewer_id` became a `uuid`
pointing into a schema this repository does not own.

**2. Auth.** _Done, and not as planned._ The step began with a self-hosted
`better-auth` and ended on Neon's Managed Better Auth, which is the same
library run by Neon with its tables in the `neon_auth` schema of the same
database. `docs/adr/0005` records both the decision and what it costs: the
version and the auth configuration become Neon's, it is Beta, and leaving Neon
stops being a connection-string change. What bought it: localhost is a trusted
origin already, and Neon's development OAuth credentials mean sign-in works
before any provider account exists. Previews still cannot sign in without
their URL being registered by hand, which is no worse than the proxy managed
and is recorded in `docs/adr/0009`. The whole `oAuthProxy` arrangement, its
shared secret and six environment variables went away with it.

The rest stood. `/sign-in` honours a validated `?next=`; `lib/auth` owns the
instance and exports the `viewer()` helper that `lib/watch` and the pages both
read; the site header — the app had none — carries sign-in and a sign-out
driven by a Server Action, so step 4 keeps its claim to the first client
component.

No client auth instance was written, under either vendor. The authorize URL is
built server-side, so nothing in the app needs one and an unused module is
worse than an absent one.

The reversal cost one module. `app/`, `components/` and the sign-in page did
not change when the vendor underneath them did, which is `docs/adr/0003`'s
boundary earning its keep on a decision it was not written for.

The header reads the session, so every route is now server-rendered on demand
where `/` used to prerender. The TMDB data cache is untouched — those fetches
still carry `next: { revalidate }` — so what is lost is prerendered HTML rather
than cached data.

The Viewer control sits behind its own Suspense boundary, which is the seam
partial prerendering needs, but the boundary alone does not restore static
rendering: without PPR a cookie read anywhere in the tree makes the whole route
dynamic. Enabling it was tried and reverted. In Next 16 the flag is
`cacheComponents`, not `experimental.ppr`, and it refuses to build until every
uncached read is inside Suspense — including the TMDB fetches on every page.
That is step 7's own description of itself, so it waits for step 7 rather than
arriving early and half-done.

**3. `lib/watch`.** _Done._ Three flat files, split by what each may import:
`lib/watch.ts` for the pure rules, which a client component will import in
step 4 and which therefore never touches `lib/db`; `lib/watch-queries.ts` for
the reads and writes, covered by the integration project; and
`lib/watch-actions.ts` for the one Server Action, `mark`, authorised against
the session and never against a client-supplied Viewer id. The pair mirrors
`lib/auth.ts` and `lib/auth-actions.ts`.

The rule turned out to be one line. A card carries two controls, Planned and
Watched, and pressing the state a Watch Record already has unmarks it — Mark
entered `CONTEXT.md` as a verb to say so. The form carries what was pressed,
never the outcome, so the action reads the row as it really is and applies
the rule there; a page that fell behind another tab cannot carry a delete
instruction in a hidden field. The same rule runs on the client for the
optimistic flip, which is why it is pure.

The action returns a result rather than throwing — `{ state }` or
`{ error }` — because the control has to show a message and there is no
`error.tsx` until step 7. Malformed input still throws: our own form cannot
produce it. A signed-out submission redirects to `/sign-in?next=` through
`nextPath`, and the action calls no `revalidatePath`, since a layout-wide one
would purge the TMDB fetch cache on every click; how the page refreshes is
step 4's decision. The action itself is untested for now — its pieces are —
and step 6's rate limit is the moment it earns a test.

The page's query is keyed by the Media on the page rather than fetching the
Viewer's whole history, so its cost belongs to the page and not to how much
the Viewer has watched. The list query landed here too, since the index was
built for it. What moved down a step is the third rule this step originally
listed: what an unanswered piece of Media looks like in a list is step 5's,
because deciding its type means deciding whether `lib/watch` calls TMDB, and
it does not.

One thing the plan did not foresee: `updated_at` on the upsert has to come
from Postgres's clock, not the process's. Drizzle's `$onUpdate` does not fire
for an upsert, and stamping `new Date()` by hand put a move and an insert on
two clocks that disagreed by more than the integration test's few
milliseconds.

**4. The control.** The first stateful client component in the app: a form
whose action is the Server Action, wrapped in `useOptimistic` so it flips on
click and reverts with a message if the write fails. Placed on `MediaCard`
and on the detail page. A signed-out click leaves through `?next=` and comes
back to a page where the Visitor clicks again; nothing is replayed for them.

**5. The lists.** `/watchlist` and `/watched`, paginated, newest first, each
with its own metadata and its own empty state. Switching between them is a
pair of links styled as tabs — reuse `components/search/kind-tabs.tsx` rather
than mirroring its styling a third time. This step also resolves a page of
Watch Records to Media: `lib/media` gains a way to fetch one Media Item by
Kind and id, the page settles twenty of them apart the way `searchMedia`
does, and the entry type carries the two ways TMDB can fail to answer — a 404
because the Media is gone, and no answer at all — because the plan's step 3
listed that rule and `lib/watch` turned out to be the wrong home for it.

**6. Account.** `/settings` with account deletion, cascading to Watch Records
through the foreign key. Rate limiting on the marking action.

**7. Polish.** `loading.tsx` and `error.tsx` per route, with Suspense around
the TMDB fetches — worth more here than elsewhere, since a list of twenty Watch
Records is twenty TMDB requests. Doing that is also what unblocks
`cacheComponents`, and with it the static rendering the header cost step 2;
the header's Suspense boundary is already in place waiting for it. The theme toggle `app/layout.tsx` has been
parked for since `03173a8`, and step 2's header is where it goes.

## Documents this produces

- `CONTEXT.md` — Visitor, Viewer, Watch Record, Planned, Watched, Watchlist,
  Mark, and a vendor-vocabulary exception that now names Better Auth
- `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
- `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
- `docs/adr/0007-watchlist-and-watched-are-one-record.md`
- `docs/adr/0008-vitest-replaces-the-node-test-runner.md`
- `docs/adr/0009-every-environment-is-a-neon-branch.md`
- `neon.ts` — which Neon services every branch carries
- `CLAUDE.md` — Commands, Tests, module boundary, standing rules
- `README.md` — a setup section, since a fresh clone now needs a Neon project
  before it will run. No OAuth application: Neon supplies development
  credentials.
- `.env.example` — what `neon checkout <branch>` writes, plus the one secret
  it does not supply

`0008` mattered most of those. `CLAUDE.md` said Vitest "should not be added",
so replacing the runner overturned a written rule and had to be recorded as
such rather than quietly edited away.

## Known frictions

Three things this plan makes worse before it makes them better. Named here so
they are decided rather than discovered.

The pre-commit drift was real and about to widen — two artefacts named
pre-commit, disagreeing quietly, with a suite split in two about to push them
further apart. Step 1 reconciles them to one definition. CI remains a third
thing and differs on purpose, having no staging area to format against.

There will be three tab treatments. Client tabs on `/`, hand-mirrored link
tabs on `/search`, and now the lists. `docs/adr/0004` already warns that the
first two drift; step 5 must reuse rather than mirror.

A Watch Record whose Media TMDB will not answer for needs a rendering. The app
already distinguishes an unanswered Kind from an empty one, and that
distinction is reused rather than a third word invented for it. This one is
sharpened rather than eased by `0006`: with no stored label, there is nothing
to fall back on.

## Deferred to v2

Ratings and reviews of a Viewer's own. Per-episode or per-season records for a
Show — v1 marks a Show as a whole. Following other Viewers. Recommendations.
Watch dates other than the moment of marking. Email as a sign-in method, and
the provider it would require. Search or filtering within a Viewer's own
lists.
