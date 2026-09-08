# BeStats

Read the glossary below before naming anything — it binds code as much as
prose.

@CONTEXT.md

## Commands

`pnpm` only — never `npm` or `yarn`.

- `pnpm dev` — dev server
- `pnpm lint` — Biome check; `pnpm format` writes the fixes
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — both projects; `test:unit` and `test:integration` run one each
- `pnpm pre-commit` — `lint-staged`, `tsc --noEmit`, and the unit project only
- `pnpm db:generate` — Drizzle migration SQL from the schema, offline
- `pnpm db:migrate` — applies migrations to whatever `DATABASE_URL` names
- `pnpm db:check` — read-only; names what that database has not run

`.husky/pre-commit` is the single line `pnpm pre-commit`, so the hook and the
script cannot disagree. CI is a third thing and differs on purpose: it has no
staging area, so it lints the whole repo, and it runs both projects.

Formatting, quote style, import order, `no-explicit-any` and strictness live
in `biome.json` and `tsconfig.json`. Don't restate them; change the config.
`biome.json` excludes `drizzle/`: drizzle-kit regenerates those files
wholesale, so formatting them means a diff on every `db:generate`. The
hand-written migrations in there follow the same rules as the rest.

## Tests

- Vitest, in two projects. `unit` is pure and runs on every commit;
  `integration` talks to Postgres and never runs on a commit.
  — `docs/adr/0008-vitest-replaces-the-node-test-runner.md`
- A test sits beside its source: `lib/format.ts` → `lib/format.test.ts`. An
  integration test takes `.integration.test.ts`, which is how the two projects
  tell each other's files apart.
- A helper shared by test files is a `lib/test-*.ts` file of its own, never an
  export from a test file: importing one test file from another runs its tests
  twice. `lib/test-viewers.ts` makes the Viewers integration files need.
- An action's test stands in for the session by mocking `lib/auth` so
  `answeredViewer()` answers with a disposable Viewer, as
  `lib/watch-actions.integration.test.ts` does — never by giving the action a
  Viewer parameter, which would be the client-supplied id it exists to refuse.
  Its unit twin mocks `lib/watch-queries` too, keeping `lib/db` out of the
  module graph, so it runs on a commit and covers the failure branch a
  migrated CI branch cannot reach.
- `@/` resolves in tests but not for `pnpm db:check`, which Node runs
  directly — and that holds for the whole graph Node loads: `db-check.ts`,
  `lib/connection-string.ts`, `lib/migration-drift.ts` and
  `lib/migration-files.ts` reach each other by relative path, extension
  included. A `@/` among them breaks the script at runtime with no type error
  and no test failure, since Vitest resolves what Node cannot.
- The integration project runs against a real Neon branch, never a local
  Postgres: the driver we ship has no interactive transactions and a local
  Postgres does, so a suite built on rolling back would be green about code
  that cannot run. Run locally that branch is `main` — production — so
  `pnpm test` writes to the database the deployed app reads.
  — `docs/adr/0009-every-environment-is-a-neon-branch.md`
  — `docs/adr/0013-local-development-shares-productions-branch.md`

## Module boundary

`app/` and `components/` import from `lib/media` and never from `lib/tmdb`.
`lib/tmdb` speaks TMDB's wire vocabulary — snake_case payloads, image hosts;
`lib/media` speaks the glossary's and is the only module that maps between the
two. `lib/tmdb` exports its wire types for `lib/media` alone. A `MediaRef` is
`lib/media`'s, and so are the two ways resolving one can fail: `mediaItems`
answers each ref with a Media Item, Gone or Unanswered, and never sees a
Watch Record.
— `docs/adr/0003-tmdb-client-separate-from-domain.md`

`lib/auth` owns Neon Auth's instance and the `user`-shaped session it hands
back; `app/` and `components/` read the current Viewer through its two helpers
and never reach for a session themselves. `answeredViewer()` answers Viewer,
Visitor or Unanswered, for the header and the public pages, which leave the
Viewer's half out when the sign-in could not be checked; `viewer()` throws on
Unanswered, for the pages that can neither redirect nor render without
knowing. `lib/media` never learns that Viewers exist.
— `docs/adr/0005-the-viewer-lives-beside-the-domain.md`

`lib/watch` holds Watch Records. `lib/watch.ts` is its pure half, so it never
imports `lib/db`, whose import throws without `DATABASE_URL`; a client
component may import it, and `lib/watch-actions.ts` for the action, and
nothing else in the module. The queries take a Viewer id and never decide
whose it is — only the action reads `lib/auth` to find out.
`answeredWatchLookup` takes the whole answer and comes back with a
`ViewerLookup` whose `states` of `null` is Unanswered and means no controls,
whether the database or the sign-in was what did not answer. `lib/watch`
reads `lib/media` for `Kind` and its guards, never the other way.

A `ViewerLookup` is what a page hands its cards: that answer, and the key of
the Viewer whose states are in it. One value, because a control given the
states without the key stays lit for a Viewer who has signed out — its state
outlives a re-render at the same position — and a missing `key` is not a type
error. So every `MarkingControl` is keyed on the `viewerKey` of the lookup its
state came from: `media-card.tsx`, `absent-card.tsx` and the detail page all
read both halves off one. `lib/viewer-key` makes that key, and is pure for
the reason `lib/watch.ts` is: `lib/auth.ts` boots Neon Auth and reads
`next/headers` at import, so a query that reached it for a string could not
be loaded outside Next at all. Two callers — `answeredWatchLookup` from the
answer it was handed, `watch-record-list.tsx` from the Viewer `viewer()` gave
it — and a third is worth looking twice at.

`watch-record-list.tsx` is `components/watch/`'s exception: the body of both
list routes, it reads `viewer()`, the queries and `lib/media` the way any page
does, since resolving Watch Records against TMDB is a page's job and not
`lib/watch`'s. It lives here only because two routes share it.

## Standing rules

- Every top-level route must be a static segment. `app/[slug]/page.tsx` would
  collide with `app/[kind]/`.
  — `docs/adr/0001-one-route-serves-both-kinds.md`
- Never drop the `first_air_date` guard in `toShowDetails`, and never replace it
  with a falsy check. TMDB's placeholder for an unaired Show is `1`, not `0`, so
  `count ? … : null` catches nothing.
  — `docs/adr/0002-placeholder-facts-are-not-facts.md`
- A Rating is absent when `voteCount` is `0`. TMDB reports `vote_average: 0`
  for Media nobody has voted on, so rendering it states a score of zero that
  nobody gave.
  — `docs/adr/0002-placeholder-facts-are-not-facts.md`
- Search is two per-Kind requests, never `/search/multi`, and its tabs are
  links so the open Kind stays in the address.
  — `docs/adr/0004-search-is-two-searches.md`
- A Watch Record is Planned or Watched, never both and never neither. One row
  per Viewer per piece of Media, keyed `(viewerId, kind, tmdbId)` — composite
  because a TMDB id is unique only within a Kind. Unmarking deletes the row.
  — `docs/adr/0007-watchlist-and-watched-are-one-record.md`
- A Watch Record stores nothing from TMDB — no label, no poster path, no
  snapshot. Rendering a list means asking TMDB for each item on it.
  — `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
- Migrations are applied by running `pnpm db:migrate` on purpose, never from a
  build command, and CI never points at production. Only a person applies them
  there, so `pnpm db:check` is how that person finds what a database has not
  run.
  — `docs/adr/0009-every-environment-is-a-neon-branch.md`
- Neon owns every table in the `neon_auth` schema: `lib/schema.ts` declares
  none of them and `drizzle.config.ts` narrows generation to `public`. A
  Drizzle `references()` across that line makes drizzle-kit try to create the
  table it points at, so every foreign key to a Viewer is a hand-written
  migration through `drizzle-kit generate --custom` — `0001` for Watch
  Records, `0003` for the marking tally, and the same for any new one.
  — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
- Environment variables come from Neon, not from typing: `neon checkout main`
  writes every one but `NEON_AUTH_COOKIE_SECRET`, which `.env.example` names.
  There is one branch, so `main` is the only thing to check out.
  — `docs/adr/0013-local-development-shares-productions-branch.md`
- Never edit or commit `.env.local`.
- A Viewer cannot delete themselves, and `/settings` went with the button that
  tried: Neon's Managed Better Auth answers `delete-user` with a bare 404.
  — `docs/adr/0012-a-viewer-cannot-delete-themselves.md`
- `proxy.ts` matches `/signed-in` and nothing else. Widening the matcher makes
  every page private: Neon's middleware protects each route it sees that is not
  on a skip list hardcoded in the package, so a Visitor reading Trending,
  search or a detail page would be sent to sign in. The lists stay off it too,
  since the middleware's redirect drops the `?next=` they compose themselves.
  `/signed-in` alone trades a verifier for a session cookie, and neither it nor
  the proxy reads a Viewer.
  — `docs/adr/0011-a-sign-in-completes-at-one-route.md`
- `cacheComponents` is on, so a page's request-time reads — `cookies()`,
  `params`, `searchParams`, a database query — sit inside a Suspense boundary
  the page draws itself, with a skeleton the height of what replaces it as the
  fallback. `loading.tsx` only where the whole page follows a check. The TMDB
  cache is `lib/tmdb`'s and by directive, never a fetch option, and a theme
  preference can never be a cookie.
  — `docs/adr/0010-the-shell-is-prerendered.md`

- The layout is drawn for a 390px screen and must not overflow a 320px one:
  nothing scrolls sideways there, nothing is clipped, and every control can
  still be pressed. The floor answers for content a Viewer will actually
  meet — a case that takes implausible data to reach may stand where it
  degrades to a scrolling page rather than to a clipped word or an unpressable
  control, and where the ADR argues it. Unprefixed classes are the phone's and
  are read on their own; a wider screen is a `sm:`/`lg:` prefix, which may add
  to what they said or undo it. There is no `max-*` variant in the repo and
  there should not be one. Nothing checks any of this, so a new width is
  measured in a browser rather than reasoned about.
  — `docs/adr/0014-the-narrow-header-gives-up-words.md`
- A control sized by its container asks about its container: `@container` on
  the wrapper and `@min-[…]` on what stacks, never `sm:`. The marking control
  has two callers at one viewport — 151px in a grid card, 320px in the detail
  page's slot — so a viewport breakpoint would split the one that had room.
  The skeleton mirrors the query, since it holds the height the control takes.
- A grid's column count and the `sizes` of its images are one decision said in
  two places. Change `grid-cols-*` without changing `sizes` and the markup
  still looks right while every phone fetches a poster far wider than it
  draws. Nothing but `sizes` tells a browser how wide an image lands, and no
  test or type will notice that it lies.

## Conventions Biome does not enforce

- Hand-written code is arrow-function consts, not `function` declarations.
- `components/` exports at the bottom (`export { MediaCard }`); `lib/` exports
  inline (`export const isKind = …`); pages `export default` at the bottom.
- Exported functions and components carry explicit return types
  (`: JSX.Element`, `: Promise<Metadata>`), though `useExplicitType` is off.
- JSDoc on exported types and non-obvious functions. `//` comments say why, not
  what.
- `components/ui/` is generated by shadcn onto **Base UI** (`@base-ui/react`),
  not Radix; leave those files in their generated shape. Hand-written
  primitives that are not shadcn's go elsewhere: `components/navigation/` holds
  `LinkTabs`, the mirror of `TabsTrigger` every set of link tabs is built on.
- A form that navigates uses `next/form`, not `<form>`. A native GET form is a
  browser navigation, so a plain `<form action='/search'>` reloads the
  document; `next/form` renders the same markup and intercepts the submit.
- Server Actions live in `lib/<module>-actions.ts` beside their module, since a
  `'use server'` file may export only async functions and cannot share a file
  with the rules it calls.
- A form that posts to a Server Action keeps that action as its `action` and
  plain named submit buttons, so it posts before hydration. A client handler
  that has to run first — an optimistic flip — goes on the button's `onClick`
  and prevents the default, the way `next/form` and `BackButton` intercept.
  Never on `formAction`: React strips a button's `name` and blocks it before
  hydration when its `formAction` is a client function, so the two disagree.

## Branch workflow

When a branch looks finished, offer to run `/branch-check` first.
