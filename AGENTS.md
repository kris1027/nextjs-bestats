# BeStats

Read the glossary below before naming anything — it binds code as much as
prose.

## Language

These words bind code as much as prose — types, functions, route segments,
filenames. The exceptions are the vendors' own vocabularies — TMDB's (`tv`,
`movie`, the snake_case fields of its payloads) and Neon Auth's (`user`,
`session`, `account`, in the `neon_auth` schema) — which stay spelled as those
vendors spell them.

**Media**:
A thing that can be watched — a Show or a Movie. The word for whichever of the
two you do not yet need to distinguish.
_Avoid_: Title, entry, content

**Show**:
Media told over seasons and episodes. Spelled `tv` in code, in URLs and on the
wire, because that is TMDB's word and TMDB is presently the whole domain;
"Show" is the word the reader sees.
_Avoid_: Series, TV show, programme

**Movie**:
Media told once, with a runtime.
_Avoid_: Film, feature

**Kind**:
Which of the two a piece of Media is. Always one or the other, never absent —
though TMDB declares it only on Trending results, so elsewhere the caller
carries it.
_Avoid_: Type, category, format

**Season**:
A numbered run of a Show's Episodes, in the order they are meant to be
watched. TMDB keeps a Show's specials as a season too, numbered 0; they belong
to no run, so they follow the seasons that do and never decide which Episode
comes next.
_Avoid_: Series, volume, part

**Episode**:
One instalment of a Show, numbered within one of its Seasons. Not Media: a
Viewer records watching an Episode, and how far a Viewer has got through a
Show is read off the Episodes they have watched rather than recorded about the
Show itself.
_Avoid_: Instalment, chapter, part

**Media Item**:
What a card shows: enough of a piece of Media to recognise it in a grid and
follow it to its page.
_Avoid_: Card, result, summary

**Media Details**:
What a piece of Media's detail page shows. Shows and Movies reach it as the
same shape, so the page never learns which Kind it is rendering.
_Avoid_: Full media, page data

**Listing**:
What a row in a list of Seasons or Episodes shows: the number, the name and its
Facts, enough to follow the row to its page. Not a Media Item, which is what a
card shows, since neither a Season nor an Episode is Media on a card.
_Avoid_: Item, entry, row

**Fact**:
One short, finished statement about a piece of Media, a Season or an Episode —
its release, its length, how many seasons it ran. Facts are the only part of
Media Details that differ by Kind, and a Fact TMDB has no value for is absent
rather than blank — including where TMDB supplies a placeholder in place of
one. An Episode's air date is the exception: where TMDB has none, the absence
is stated, since an Episode without one cannot be scored.
_Avoid_: Attribute, metadata, field, stat

**Query**:
The words a visitor typed to find Media. TMDB's word too, so it stays spelled
`query` on the wire and in code; the address bar shortens it to `q`.
_Avoid_: Search term, keyword, input

**Matches**:
What a Query finds for one Kind — the Media Items TMDB matched, and how many
it matched in all. Only the first page is fetched, so the count is usually
larger than the list, and the page says so rather than letting the list stand
for the whole. A Kind TMDB did not answer for has no Matches at all, which is
not the same as matching nothing and is never shown as an empty list or a
count of zero.
_Avoid_: Results, hits, search results

**Unanswered**:
What the app has when it asked a source a question and got no answer — a
Kind TMDB did not answer for, a Viewer's Watch Records the database did not
return, whether a Visitor is a Viewer when the sign-in could not be checked.
Not the same as an answer of nothing: an Unanswered question is never
shown as an empty list, a count of zero, or an absence, and whatever depended
on the answer is left out rather than drawn as if the answer had been "none".
_Avoid_: Failed, error, missing, empty

**Gone**:
Media or an Episode TMDB once had and no longer has. Not the same as
Unanswered, which may answer next time: Gone is TMDB's answer. A Watch Record
for something Gone still exists and still renders, since what survives is that
the Viewer watched something. TMDB no longer says whether Gone Media is out, so
it is drawn on both the Watchlist and Upcoming rather than placed on one; a
Gone Episode has no position, so it is listed on its Show's page with its Score
and never counts towards the furthest Episode.
_Avoid_: Deleted, removed, missing, 404

**Rating**:
TMDB's average score for a piece of Media or an Episode, out of ten.
Everyone's, and never one Viewer's — what a Viewer thinks of a piece of Media
is a Score. Media nobody has voted on has no Rating: TMDB reports a `0`, which
is a placeholder standing in for an absent score rather than a score of zero,
so it is left out the way an absent Fact is.
_Avoid_: Stars, vote, review

**Artwork**:
A picture TMDB supplies — a Poster or a Backdrop for a piece of Media, or a
Still for an Episode.
_Avoid_: Image, art, kind

**Trending**:
What TMDB reports as most popular over the past week. It is the only Media the
home page shows, and the ranking is TMDB's, not the app's.
_Avoid_: Popular, top, featured

**Visitor**:
Anyone using BeStats. Everything the app shows is shown to a Visitor, signed in
or not; signing in is what makes one a Viewer.
_Avoid_: User, guest, anonymous

**Viewer**:
A Visitor who has signed in. Spelled `user` where Neon Auth spells it, for
the same reason a Show is spelled `tv`; Viewer is the word the reader sees, and
the only thing a Watch Record can belong to.
_Avoid_: User, account, member, profile

**Watch Record**:
One Viewer's recorded relationship to one Movie, Show or Episode, in exactly
one state. A Movie's is Planned, or Watched with a Score; a Show's is Planned
or Stopped; an Episode's is Watched with a Score. Whatever a Viewer has said
nothing about has no Watch Record at all, which is not a further state — and a
Show a Viewer is partway through has none of its own either, since that it is
under way is read off the Watch Records of its Episodes.
_Avoid_: Entry, mark, status, tracking

**Planned**:
The state of a Watch Record for a Movie or Show a Viewer means to watch. A
Show's Planned record lasts only until the Viewer watches one of its Episodes.
_Avoid_: Todo, saved, wishlist, want

**Watched**:
The state of a Watch Record for a Movie or Episode a Viewer has watched, which
always carries their Score: watching something and saying what you thought of
it are one act here, and there is no way to record the first without the
second. It replaces Planned rather than joining it, because you no longer mean
to watch what you have watched, and the Score does not survive the move back.
A Show is never Watched, and the Watched list holds the Shows a Viewer is
Caught up with rather than any record of theirs. A Show is finished when it
has ended and TMDB lists no Episode after the furthest the Viewer has watched,
which its own control reads; the lists ask instead whether they are Caught up.
_Avoid_: Seen, done, finished

**Stopped**:
The state of a Watch Record for a Show a Viewer has given up on. It keeps the
Show off every list without touching the Scores its Episodes carry, and
watching another of its Episodes takes the Viewer back to where they were. A
Stopped Show that is Gone is the exception: it has no page to take the record
back on, so it is drawn on both the Watchlist and Upcoming as Gone Media is.
_Avoid_: Dropped, abandoned, archived, paused, hidden

**Score**:
What one Viewer thinks of a Movie or an Episode, in whole stars from 1 to 10. A
Score is the Viewer's own and TMDB never sees it, which is what separates it
from a Rating; giving one is what makes a Watch Record Watched, so a Score
never sits on a Planned record and a Watched record never lacks one.
_Avoid_: Rating, vote, review, grade

**Watchlist**:
What a Viewer can watch now: each Planned Movie that has been released, and
each Show they are under way with or have Planned, at its next Episode once
that has aired. The next Episode is the one after the furthest the Viewer has
watched, Specials aside, and the first of the Show when they have watched
none. What is Upcoming, Stopped or Caught up with is not on it.
_Avoid_: Queue, saved, list, favourites

**Upcoming**:
What a Viewer is waiting for: Planned Movies not yet released, and Shows whose
next Episode has a date that has not come. A Show a Viewer is Caught up with
is waiting for nothing and is not Upcoming, whether it has ended or is still
running: neither an Episode TMDB lists without a date nor a Season it
announces with no Episodes in it yet is a date. Waiting is the whole of what
a Viewer can do with something they have not started, which is why a Movie
with no release date is Upcoming and so is a Show whose first Episode TMDB has
not dated — a Show they have watched no Episode of is never Caught up, so it
waits here until that Episode has aired and is on the Watchlist after. Only a
Show they are part way through leaves this list for want of a date.
_Avoid_: Coming soon, scheduled, calendar, future

**Caught up**:
Where a Viewer stands with a Show once they have watched an Episode of it and
TMDB names no date for anything after the furthest they watched — nothing left
with a date on it, whether or not TMDB lists an undated Episode or announces a
Season with no Episodes in it yet. What puts a Show on the Watched list,
whether or not it has ended: one that has ended is over, and one still running
is between Seasons and leaves the list the moment TMDB dates another Episode.
Not a state and never a Watch Record: like Tracked, it is read off the
Episodes the Viewer has watched and what TMDB says.
_Avoid_: Complete, done, up to date, seen

**Tracked**:
A Movie or Show a Viewer is following, which is what the lists are placed
from: each one they have Planned, and each Show they have watched an Episode
of, unless its record is Stopped. A Watched Movie is not tracked, a Stopped
Show is not, and neither is anything the Viewer has said nothing about. Not a
state: a Show under way is tracked with no Watch Record at all.
_Avoid_: Followed, active, in progress

**Mark**:
To give a Movie, Show or Episode a Watch Record in one of the states it can
hold, replacing whichever it had. Marking what a Watch Record already says
unmarks it, which deletes the record: pressing Planned on a Planned record, or
a Viewer's own Score on a Watched one. The verb only: the thing it makes is a
Watch Record, never "a mark". What that record says — its state, and its Score
when Watched — is its Marking, and that is the only noun the verb lends.
_Avoid_: Save, add, track, toggle, set

## Commands

`pnpm` only — never `npm` or `yarn`.

- `pnpm bootstrap` — writes `.env.local` from Neon and says what setup has left
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
  migrated CI branch cannot reach. An action that asks TMDB has `lib/media`
  mocked in both, since CI has no TMDB token.
- `@/` resolves in tests but not for `pnpm db:check` or `pnpm bootstrap`,
  which Node runs directly — and that holds for the whole graph Node loads:
  `db-check.ts`, `bootstrap.ts`, `lib/connection-string.ts`,
  `lib/env-file.ts`, `lib/migration-drift.ts` and `lib/migration-files.ts`
  reach each other by relative path, extension included. A `@/` among them
  breaks the script at runtime with no type error and no test failure, since
  Vitest resolves what Node cannot.
- The integration project runs against a real Neon branch, never a local
  Postgres: the driver we ship has no interactive transactions and a local
  Postgres does, so a suite built on rolling back would be green about code
  that cannot run. Run locally that branch is `main` — production — so
  `pnpm test` writes to the database the deployed app reads.

## Module boundary

`app/` and `components/` import from `lib/media` and never from `lib/tmdb`.
`lib/tmdb` speaks TMDB's wire vocabulary — snake_case payloads, image hosts;
`lib/media` speaks the glossary's and is the only module that maps between the
two. `lib/tmdb` exports its wire types for `lib/media` alone. A `MediaRef` is
`lib/media`'s, and so are the two ways resolving one can fail: `mediaItems`
answers each ref with a Media Item, Gone or Unanswered, and never sees a
Watch Record.

`lib/auth` owns Neon Auth's instance and the `user`-shaped session it hands
back; `app/` and `components/` read the current Viewer through its two helpers
and never reach for a session themselves. `answeredViewer()` answers Viewer,
Visitor or Unanswered, for the header and the public pages, which leave the
Viewer's half out when the sign-in could not be checked; `viewer()` throws on
Unanswered, for the pages that can neither redirect nor render without
knowing. `lib/media` never learns that Viewers exist.

It owns that instance twice over, and the two are not interchangeable. `auth`
writes cookies and is for `proxy.ts`, the API route and `lib/auth-actions.ts`;
`reader` cannot write and is what `askViewer` reads through. Merging them
breaks signing in and out with no type error and no failing test.

`lib/watch` holds Watch Records. `lib/watch.ts` is its pure half, so it never
imports `lib/db`, whose import throws without `DATABASE_URL`; a client
component may import it, and `lib/watch-actions.ts` for the actions, and
nothing else in the module. The queries take a Viewer id and never decide
whose it is — only the actions read `lib/auth` to find out.
`answeredWatchLookup` takes the whole answer and comes back with a
`ViewerLookup` whose `markings` of `null` is Unanswered and means no controls,
whether the database or the sign-in was what did not answer. `lib/watch`
reads `lib/media`, never the other way — and `lib/watch.ts` reads only its
types: `lib/media` reaches `lib/tmdb` and `next/cache`, so a value imported
there would put TMDB's client in a browser bundle, and the build refuses it
with no type error to warn first. A rule that needs one, like `hasAired`, goes
in `lib/watch-lists.ts`, which places what a Viewer tracks on the Watchlist,
Upcoming or Watched.

`lib/db`, `lib/tmdb`, `lib/auth`, `lib/watch-queries` and `lib/media` open
with `import 'server-only'`, so a client component that imports a value from
one fails `pnpm build`; `import type` is erased and passes. Vitest runs
outside the `react-server` condition the package asks for, so
`vitest.config.ts` aliases it to the empty `lib/test-server-only.ts`. The
`db:check` graph never takes it: Node runs that graph without the alias, and
the import would throw there.

A `ViewerLookup` is what a page hands its cards: that answer, and the key of
the Viewer whose markings are in it. An Episode page has no cards and hands
its control a `ViewerEpisodeLookup` instead, the same pair keyed by Episode id,
which `answeredEpisodeLookup` and `answeredShowEpisodeLookup` answer the same
way. One value, because a control given the markings without the key stays
lit for a Viewer who has signed out — its state outlives a re-render at the
same position — and a missing `key` is not a type error. So whatever holds
that state is keyed on the `viewerKey` of the lookup it came from:
`absent-card.tsx` keys its `MarkableCard`, `media-card.tsx` its
`CardPlannedButton`, the Media page its `MarkingControl` or `ShowControl` and
each `GoneEpisodeRow`, and the Episode page its `EpisodeScoreControl`, and
each reads the two halves off one value. `lib/viewer-key` makes
that key, and is pure for the reason `lib/watch.ts` is: `lib/auth.ts` boots
Neon Auth and reads `next/headers` at import, so a query that reached it for a
string could not be loaded outside Next at all. Four callers —
`answeredWatchLookup`, `answeredEpisodeLookup` and `answeredShowEpisodeLookup`
from the answer each was handed, `watch-record-list.tsx` from the Viewer
`viewer()` gave it — and a fifth is worth looking twice at.

`watch-record-list.tsx` is `components/watch/`'s exception: the body of all
three list routes, it reads `viewer()`, the queries and `lib/media` the way any
page does, since resolving Watch Records against TMDB is a page's job and not
`lib/watch`'s. It lives here only because three routes share it.

## Standing rules

- There is no `docs/` folder and there are no ADRs. A decision worth keeping
  is one bullet here, and its why is a comment beside the code it governs.
- Every top-level route must be a static segment. `app/[slug]/page.tsx` would
  collide with `app/[kind]/`.
- Never drop the `first_air_date` guard in `toShowDetails`, and never replace it
  with a falsy check. TMDB's placeholder for an unaired Show is `1`, not `0`, so
  `count ? … : null` catches nothing.
- A Rating is absent when `voteCount` is `0`. TMDB reports `vote_average: 0`
  for Media nobody has voted on, so rendering it states a score of zero that
  nobody gave.
- Search is two per-Kind requests, never `/search/multi`, and its tabs are
  links so the open Kind stays in the address.
- A tab row above a grid is the Kind. The lists show one Kind at a time and
  name it `?kind=`; the way between the Watchlist, Upcoming and the Watched
  list is the header's, not the page's. Trending alone may hold its Kind in
  the client. There is no All tab, and `isKind` stays the guard that reads the
  address.
- A Watch Record is in exactly one state, never two and never none. One row
  per Viewer per piece of Media, keyed `(viewerId, kind, tmdbId)` — composite
  because a TMDB id is unique only within a Kind. Unmarking deletes the row.
- An Episode's record is a row of `episode_records`, keyed
  `(viewerId, episodeId)` on TMDB's id for the Episode and never its season
  and number, which TMDB renumbers.
- A Watched record always carries a Score of 1 to 10 and a Planned or Stopped
  one never does, only a Movie's record is Watched, and only a Show's is
  Stopped; the check constraints on `watch_records` are what say so, not the
  code that writes it. Giving a Score is how a Movie's record becomes Watched,
  so a move back to Planned destroys it. A Show's own control draws one button
  and no stars — Planned before its first Episode is scored, Stop watching
  after, nothing once finished, and a record's own button whenever it has one,
  which `showPress` decides — and the only stars on its page are the Scores of
  its Gone Episodes, which belong to them and not to the Show. Watched → Shows
  is placed from TMDB's answer like the other lists, and a Stopped Show is on
  none of them unless it is Gone. A card sets one Marking and no other: its
  bookmark marks Planned, and is withheld on a Watched Movie, whose Score that
  press would destroy from a grid with no stars in sight, on a Stopped Show,
  and on a Show a list knows is under way. Scoring and stopping are the
  detail page's, and a card's one star is TMDB's Rating until the Viewer
  scores a Movie, theirs after. `AbsentCard` is the exception, since Gone
  Media 404s on the detail page and its card has no link to one: it draws the
  labelled button that page would, Planned or Stop watching, and
  that button is the only way such a record is ever removed or such a Show
  stopped. So `trackedMedia` brings Stopped Shows flagged, and `placed` keeps
  a Gone one on the lists: leaving them out in SQL, before TMDB is asked,
  would stop a Gone Show for good.
- The lists ask one thing about a Show the Viewer is under way with: whether a
  day lies ahead of them. A dated next Episode is Upcoming, or the Watchlist
  once that day has passed; no day ahead is Watched, and an Episode TMDB lists
  undated and a season it announces empty are both no day — every Episode left
  is read and not only the next, since an undated one can stand in front of a
  dated one. A Show they have watched no Episode of is never caught up and so
  never leaves the lists: it is on the Watchlist once its first Episode has
  aired and Upcoming before that, undated included, since a Planned Show on no
  list is reachable from nowhere. `caughtUp` says all of that, and
  `caughtUpAt` reads the furthest Episode scored and never the last TMDB
  lists — the two are one Episode only when nothing is left at all.
  `hasFinished` keeps the narrower rule and the `ended` check for
  `showProgress` alone: an undated Episode is still an Episode left, so such a
  Show is under way on its own page and must go on drawing Stop watching.
- A Watch Record stores nothing from TMDB — no label, no poster path, no
  snapshot. Rendering a list means asking TMDB for each item on it.
- Migrations are applied by running `pnpm db:migrate` on purpose, never from a
  build command, and CI never points at production. Only a person applies them
  there, so `pnpm db:check` is how that person finds what a database has not
  run.
- Neon owns every table in the `neon_auth` schema: `lib/schema.ts` declares
  none of them and `drizzle.config.ts` narrows generation to `public`. A
  Drizzle `references()` across that line makes drizzle-kit try to create the
  table it points at, so every foreign key to a Viewer is a hand-written
  migration through `drizzle-kit generate --custom` — `0001`, `0003` and
  `0008` so far, and the same for any new one.
- A migration that adds an enum value never uses it: drizzle-kit applies every
  pending migration in one transaction, and Postgres refuses a value used in
  the transaction that added it. So no check constraint names `stopped`;
  `0011` says what a Movie's row can be instead.
- Environment variables come from Neon, not from typing: `pnpm bootstrap`
  pulls every one but `TMDB_API_TOKEN` from the branch `.neon` pins, and
  generates `NEON_AUTH_COOKIE_SECRET`. There is one branch, so `.neon` is
  committed and pins `main`. `bootstrap` never runs `db:migrate`; it runs
  `db:check` and says what is pending. The secret cannot be missing —
  `createNeonAuth` asserts it at import, so the whole app stops there, public
  half included — while the base URL is not asserted at all, so an unset one
  is an outage Unanswered draws.
- Never edit or commit `.env.local`. `pnpm bootstrap` is the one exception, run
  by a person, and it fills only what is missing.
- A Viewer cannot delete themselves, and `/settings` went with the button that
  tried: Neon's Managed Better Auth answers `delete-user` with a bare 404.
- `proxy.ts` matches `/signed-in` and nothing else. Widening the matcher makes
  every page private: Neon's middleware protects each route it sees that is not
  on a skip list hardcoded in the package, so a Visitor reading Trending,
  search or a detail page would be sent to sign in. The lists stay off it too,
  since the middleware's redirect drops the `?next=` they compose themselves.
  `/signed-in` alone trades a verifier for a session cookie, and neither it nor
  the proxy reads a Viewer.
- Reading the session never writes a cookie. Neon's adapter hands every server
  method a `setCookie` of `cookieStore.set`, which Next refuses while a page
  renders, so a render that asked `auth` would lose the Viewer's half of the
  app on every session refresh — once a day, silently, caught as Unanswered.
  A render asks `reader`, whose `setCookie` does nothing, and so do the
  marking actions, which ask `answeredViewer` the way a render does. Only
  `lib/auth-actions.ts` and the sign-in exchange hold `auth` and write, so the
  sign-in exchange is the only thing that still extends a session.
- `cacheComponents` is on, so a page's request-time reads — `cookies()`,
  `params`, `searchParams`, a database query — sit inside a Suspense boundary
  the page draws itself, with a skeleton the height of what replaces it as the
  fallback — or of the common case, where the fallback cannot read which card
  lands, as `media-skeleton.tsx` says. `loading.tsx` only where the whole page
  follows a check. The TMDB
  cache is `lib/tmdb`'s and by directive, never a fetch option, and a theme
  preference can never be a cookie.
- The layout is drawn for a 390px screen and must not overflow a 320px one:
  nothing scrolls sideways there, nothing is clipped, and every control can
  still be pressed. The floor answers for content a Viewer will actually
  meet — a case that takes implausible data to reach may stand where it
  degrades to a scrolling page rather than to a clipped word or an unpressable
  control. Unprefixed classes are the phone's and
  are read on their own; a wider screen is a `sm:`/`lg:` prefix, which may add
  to what they said or undo it. There is no `max-*` variant in the repo and
  there should not be one. Nothing checks any of this, so a new width is
  measured in a browser rather than reasoned about.
- A control that two places draw at two widths is two components, not one
  that adapts. The marking control was one, with a container query on it, and
  is now `PlannedButton` — which `AbsentCard` and the Media page draw — and
  `StarRow`, which only a detail page can, with a card's round bookmark a
  third, `CardPlannedButton`: ten targets need the 288px a detail
  page has at the 320px floor, and a card's control has 116px there.
  Splitting won because the two differ in what they can do and not only in
  how wide they are, and the widths are measured in a browser as always.
- Should a control have to adapt after all, it asks its container and never
  the viewport: `@container` on the wrapper and `@min-[…]` on what stacks,
  never `sm:`. A card is 151px in a grid at one viewport and 244px at another
  while the detail page's slot beside it barely moves, so a viewport
  breakpoint would split the one that had room. Nothing in the repo asks this
  at present; the rule is here for the next control that has to.
- Each control's skeleton mirrors its own query, since it holds the height
  that control takes.
- A grid's column count and the `sizes` of its images are one decision said in
  two places. Change `grid-cols-*` without changing `sizes` and the markup
  still looks right while every phone fetches a poster far wider than it
  draws. Nothing but `sizes` tells a browser how wide an image lands, and no
  test or type will notice that it lies.
- A card's three colours are `--rating` for TMDB's Rating, `--score` for the
  Viewer's Score and `--planned` for a Planned record, and nothing else wears
  them. `CardGlyph` draws each mark for the card and for `CardLegend` alike,
  so a colour reused elsewhere would be explained as something it is not.
  `--score` is not `--primary-accent`: that one is text on the page, and this
  is a mark on a poster, brighter so it reads over one. The legend is drawn
  in the shell of each page that draws cards, last on it, and reads no
  Viewer: it says what a card there can show, so it never waits and never
  moves. The card is the one rounded thing in the app.

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
- A hook any page might want lives in `lib/`, like `lib/use-address.ts`. A
  hook that belongs to one family of components lives beside them, like
  `components/watch/use-marking.ts`, which the marking controls share and
  nothing outside `components/watch/` can use. Hooks being in two places is
  that split and not an accident.
- A form that posts to a Server Action keeps that action as its `action` and
  plain named submit buttons, so it posts before hydration. A client handler
  that has to run first — an optimistic flip — goes on the button's `onClick`
  and prevents the default, the way `next/form` and `BackButton` intercept.
  Never on `formAction`: React strips a button's `name` and blocks it before
  hydration when its `formAction` is a client function, so the two disagree.

## Branch workflow

When a branch looks finished, offer to run `/branch-check` first.
