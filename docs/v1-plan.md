# BeStats v1

The release where BeStats stops being a TMDB browser and becomes yours. A
Viewer signs in and records what they mean to watch and what they have
watched.

`CONTEXT.md` has promised this from the start — "in time, to record what you
have watched" — and `docs/adr/0003` split the domain layer off from the TMDB
client precisely so those records would have "a home that is not named after a
third-party API". v1 is that home.

This file is a plan, not a record of decisions. The decisions that are hard to
reverse become ADRs in step 0 and the new words go into `CONTEXT.md`. Once
they exist, they are the authority and this file is scaffolding.

## Language

Three terms enter the glossary in step 0. They are drafted here; `CONTEXT.md`
is where they become binding.

**Viewer**:
A person signed in to BeStats. The word the reader's own watching earns them,
rather than the word a system would use for them.
_Avoid_: User, account, member, profile

**Watch Record**:
One Viewer's recorded relationship to one piece of Media. It is in exactly one
state — Planned or Watched — and a piece of Media a Viewer has said nothing
about has no Watch Record at all, which is not a third state.
_Avoid_: Entry, mark, status, tracking

**Watchlist**:
A Viewer's Planned Watch Records — the Media they mean to watch. Watched Media
is not on it, because you no longer mean to watch what you have watched.
_Avoid_: Queue, saved, list, favourites

Note that Entry was already unavailable: it sits on Media's _Avoid_ list.

## The invariant

A Watch Record is Planned or Watched, never both and never neither. Marking
Watched takes the Media off the Watchlist; marking Planned puts it back.
Unmarking deletes the row.

One row per Viewer per piece of Media, keyed `(viewerId, kind, tmdbId)`. The
key is composite because TMDB ids are only unique within a Kind — `tv/1399`
and `movie/1399` are different Media. The state is a Postgres enum, so the
invariant is enforced by the schema rather than by the code that writes it.

A Watch Record stores nothing from TMDB. No label, no poster path, no
snapshot. Rendering a list means asking TMDB for each item, which keeps
`CONTEXT.md` literally true — every fact the app shows about a title comes
from TMDB — and leaves no second copy that can disagree with the first.

## Architecture

```
lib/tmdb   TMDB's wire vocabulary                     unchanged
lib/media  the glossary's words, TMDB-shaped          unchanged
lib/watch  Viewer and Watch Record, from our own DB   new
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
| Auth       | Better Auth                   | the Viewer lives in our database, so a Watch Record has a real foreign key |
| Sign-in    | Google and GitHub only        | removes email delivery, verification, reset and hashing from v1 entirely |
| Mutations  | Server Actions + `useOptimistic` | instant on a grid, still a real form, degrades without JS |
| Tests      | Vitest, replacing `node --test` | unit on pre-commit, integration against real Postgres in CI |
| CI         | GitHub Actions                | there is none today                                       |

## Routes

| Route                     | State                                              |
| ------------------------- | -------------------------------------------------- |
| `/`, `/search`, `/[kind]/[id]` | unchanged and public, now carrying marking controls |
| `/watchlist`, `/watched`  | new; paginated at 20, newest first, `?page=` in the address |
| `/sign-in`                | new; Google and GitHub, honours `?next=`           |
| `/settings`               | new; delete account, cascading to Watch Records    |

Every new top-level segment is static, so `docs/adr/0001` holds.

Marking controls render for everyone, signed in or not. A signed-out click
goes to `/sign-in?next=…` and the mark is applied on return — a visitor who
never sees the control never learns the app does anything TMDB does not, and
one rendering path for a card is worth more than a hidden one.

Lists paginate at 20 because each item costs a TMDB request. Twenty per page
bounds that cost whatever a Viewer has watched, matches the page size TMDB
uses everywhere else in the app, and lets `formatTally` say "the top 20 of
214 movies" the way it already does for Matches.

## Build order

Each step should land as its own branch and PR, in this order. Steps 1 and 2
are infrastructure with nothing to see; step 4 is the first one a visitor
would notice.

**0. Words first.** Add Viewer, Watch Record and Watchlist to `CONTEXT.md`.
Write the four ADRs listed below. Update `CLAUDE.md`: the module boundary
gains `lib/watch`, the Tests section is rewritten for Vitest, the standing
rules gain the exclusive-state invariant. No code.

**1. Foundation.** Migrate `lib/format.test.mts` to Vitest as
`lib/format.test.ts`, with `@/` path aliases working. Split the suite into
unit and integration projects. Add the GitHub Actions workflow — lint,
typecheck, unit, then integration against a Neon branch. Fix the pre-commit
drift `CLAUDE.md` currently documents rather than documenting it further.
Provision Neon, add Drizzle, write the schema and the first migration.

**2. Auth.** Better Auth with the Drizzle adapter. Google and GitHub
providers. `/sign-in` honouring `?next=`. A session helper `lib/watch` and
the pages can both read. Sign-in and sign-out in the header. New environment
variables into `.env.example`.

**3. `lib/watch`.** Pure rules in one file and tested — the state transitions,
building the lookup a page hands its cards, what an unanswered piece of Media
looks like in a list. Thin query functions beside them, covered by the
integration project. The Server Actions that set and clear a Watch Record,
authorised against the session and never against a client-supplied Viewer id.

**4. The control.** The first stateful client component in the app: a form
whose action is the Server Action, wrapped in `useOptimistic` so it flips on
click and reverts with a message if the write fails. Placed on `MediaCard`
and on the detail page.

**5. The lists.** `/watchlist` and `/watched`, paginated, newest first, each
with its own metadata and its own empty state. Switching between them is a
pair of links styled as tabs — reuse `components/search/kind-tabs.tsx` rather
than mirroring its styling a third time.

**6. Account.** `/settings` with account deletion, cascading to Watch Records
through the foreign key. Rate limiting on the marking action.

**7. Polish.** `loading.tsx` and `error.tsx` per route, with Suspense around
the TMDB fetches. The theme toggle `app/layout.tsx` has been parked for since
`03173a8`. Deploy.

## Documents this produces

- `CONTEXT.md` — Viewer, Watch Record, Watchlist
- `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
- `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
- `docs/adr/0007-watchlist-and-watched-are-one-record.md`
- `docs/adr/0008-vitest-replaces-the-node-test-runner.md`
- `CLAUDE.md` — module boundary, Tests, standing rules

`0008` matters most of those. `CLAUDE.md` presently says Vitest "should not be
added", so replacing the runner overturns a written rule and has to be
recorded as such rather than quietly edited away.

## Known frictions

Three things this plan makes worse before it makes them better. Named here so
they are decided rather than discovered.

The pre-commit drift is real and about to widen. `.husky/pre-commit` runs
`pnpm lint-staged`, `pnpm typecheck` and `pnpm test` directly, while the
`pre-commit` script checks the whole repo without writing. A suite split in
two makes the two definitions disagree further. Step 1 reconciles them.

There will be three tab treatments. Client tabs on `/`, hand-mirrored link
tabs on `/search`, and now the lists. `docs/adr/0004` already warns that the
first two drift; step 5 must reuse rather than mirror.

A Watch Record whose Media TMDB will not answer for needs a rendering. The app
already distinguishes an unanswered Kind from an empty one, and that
distinction is reused rather than a third word invented for it.

## Deferred to v2

Ratings and reviews of a Viewer's own. Per-episode or per-season records for a
Show — v1 marks a Show as a whole. Following other Viewers. Recommendations.
Watch dates other than the moment of marking. Email as a sign-in method, and
the provider it would require. Search or filtering within a Viewer's own
lists.
