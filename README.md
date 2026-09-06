# BeStats

Browse what is trending on TMDB — Shows and Movies, their artwork, their
ratings, and the handful of facts that describe them.

Built with the Next.js App Router. Every page is server-rendered, every fact
comes from TMDB, and there is no client-side data fetching anywhere in the
app.

> **Status:** a Viewer can sign in, and the database that will hold their
> Watch Records exists. Nothing is recorded yet — the marking control and the
> `/watchlist` and `/watched` pages are what comes next. See
> [Roadmap](#roadmap).

## What it does

**Trending** (`/`) lists what TMDB reports as most popular this week, in two
tabs. The ranking is TMDB's, not ours.

**Search** (`/search?q=…`) runs a query against Shows and Movies as two
separate requests and presents them as two tabs, each ranked within its own
Kind. One failing leaves the other's results intact, and the open tab lives in
the address so a search can be linked to.

**Detail** (`/tv/1399`, `/movie/693134`) shows one piece of Media — its
artwork, overview, rating, and its facts. Shows and Movies share a single
route and a single page component.

Throughout, an absent fact is left out rather than rendered blank. TMDB
supplies placeholders — `vote_average: 0` for something nobody has voted on,
a season count of `1` for a show that has never aired — and BeStats treats
those as the absences they are rather than reporting them as measurements.

## Getting started

### Prerequisites

- **Node.js 20.9 or newer.** Next.js 16 requires it.
- **pnpm.** The version is pinned in `package.json` via `packageManager`, so
  `corepack enable` will select it for you. npm and yarn are not supported
  here.
- **A TMDB read access token.** Free — create an account, then generate one
  at <https://www.themoviedb.org/settings/api>.
- **A Neon Postgres project.** Free, and scales to zero. Create a `dev`
  branch alongside `main` and point your `DATABASE_URL` at `dev` — `main` is
  production.
- **A Google and a GitHub OAuth application**, if you want sign-in to work.
  Browsing needs neither. Register the **production** callback only; see
  [Environments](#environments) for why there is no localhost entry.

### Setup

```bash
git clone https://github.com/kris1027/nextjs-bestats.git
cd nextjs-bestats
corepack enable
pnpm install

cp .env.example .env.local
# open .env.local and fill in the blanks — see Environment below

pnpm db:migrate   # creates the tables on whatever DATABASE_URL names
pnpm dev
```

The app is then at <http://localhost:3000>. Next 16 uses Turbopack by default
for both `dev` and `build`, so there are no bundler flags to pass.

### Environment

Every variable is server-only. None carries the `NEXT_PUBLIC_` prefix, because
every TMDB request is made from a Server Component and every session is read
on the server — no token and no session ever reaches a browser.

| Variable                     | Purpose                                  | Value in `.env.example`            |
| ---------------------------- | ---------------------------------------- | ---------------------------------- |
| `TMDB_API_TOKEN`             | Bearer token for the API                 | _yours to fill in_                 |
| `TMDB_API_URL`               | API base                                 | `https://api.themoviedb.org/3`     |
| `TMDB_POSTER_PATH`           | Poster image base, sized `w780`          | `https://image.tmdb.org/t/p/w780`  |
| `TMDB_BACKDROP_PATH`         | Backdrop image base, `w1280`             | `https://image.tmdb.org/t/p/w1280` |
| `DATABASE_URL`               | A Neon branch — `dev` locally            | _yours to fill in_                 |
| `BETTER_AUTH_SECRET`         | Signs sessions                           | _yours to fill in_                 |
| `BETTER_AUTH_URL`            | This environment's own origin            | `http://localhost:3000`            |
| `BETTER_AUTH_PRODUCTION_URL` | Where every OAuth callback lands         | the production origin              |
| `OAUTH_PROXY_SECRET`         | Encrypts the profile in transit          | _yours to fill in_                 |
| `GOOGLE_CLIENT_ID`           | Google OAuth application                 | _yours to fill in_                 |
| `GOOGLE_CLIENT_SECRET`       | Google OAuth application                 | _yours to fill in_                 |
| `GITHUB_CLIENT_ID`           | GitHub OAuth application                 | _yours to fill in_                 |
| `GITHUB_CLIENT_SECRET`       | GitHub OAuth application                 | _yours to fill in_                 |

Generate the two secrets with `openssl rand -base64 32`. `OAUTH_PROXY_SECRET`
must be byte-identical in every environment; a mismatch surfaces as a
decryption error rather than as a configuration one.

`.env.local` is gitignored and must never be committed or edited by tooling.

### Environments

There is no `docker-compose.yml` and no local Postgres. Every environment is a
Neon branch: `main` is production, a long-lived `dev` branch serves local work
and preview deployments, and CI creates one per run and drops it afterwards.
The driver this app ships has no interactive transactions and a local Postgres
does, so a test suite built on rolling back would be green about code that
cannot run.

Google and GitHub each have exactly one OAuth application, and its only
registered redirect is on the production domain. Better Auth's `oAuthProxy`
plugin points every environment's `redirect_uri` there, so signing in from
`localhost:3000` reaches a callback on production and comes back. This reads
as a misconfiguration and is not one — preview deployments get a new URL on
every push and neither provider accepts a wildcard redirect. Production
performs the token exchange and hands the encrypted profile back; it writes
nothing to the production database, and a local sign-in creates its session in
the local one.

Both are explained in
[`docs/adr/0009`](docs/adr/0009-every-environment-is-a-neon-branch.md).

## Commands

| Command           | What it does                                          |
| ----------------- | ----------------------------------------------------- |
| `pnpm dev`        | Development server                                    |
| `pnpm build`      | Production build                                      |
| `pnpm start`      | Serve a production build                              |
| `pnpm lint`       | Biome check, read-only                                |
| `pnpm format`     | Biome check, writing the fixes                        |
| `pnpm typecheck`  | `tsc --noEmit`                                        |
| `pnpm test`       | Both Vitest projects                                  |
| `pnpm test:unit`  | The pure suite; what runs on every commit             |
| `pnpm test:integration` | The suite that talks to Postgres                |
| `pnpm db:generate` | Migration SQL from the schema, without a database    |
| `pnpm db:migrate` | Applies migrations to whatever `DATABASE_URL` names   |
| `pnpm pre-commit` | lint-staged, `tsc --noEmit`, and the unit project     |

`.husky/pre-commit` is the single line `pnpm pre-commit`, so the hook and the
script cannot disagree. CI is a third thing and differs on purpose: it has no
staging area, so it lints the whole repo, and it runs both projects.

## Structure

```
app/
  page.tsx               Trending
  search/page.tsx        Search, both Kinds
  [kind]/[id]/page.tsx   One detail page serving Shows and Movies
  sign-in/page.tsx       Google and GitHub, honouring ?next=
  api/auth/[...all]/     Better Auth's handler
  layout.tsx             Fonts, metadata, theme, header
components/
  media/                 Card, list, detail, placeholder artwork
  search/                Search form and its Kind tabs
  layout/                The site header
  ui/                    Generated by shadcn onto Base UI — leave as generated
lib/
  tmdb.ts                TMDB's wire vocabulary
  media.ts               The domain's vocabulary
  format.ts              Locale, plurals, dates, runtimes
  auth.ts                Better Auth's instance, and viewer()
  auth-actions.ts        Sign in and sign out, as Server Actions
  auth-schema.ts         Better Auth's four tables
  schema.ts              Watch Records, and the tables above
  db.ts                  The Drizzle client
  next-path.ts           Validates ?next=
drizzle/                 Generated migrations — committed, never edited
docs/
  adr/                   Decisions, and why they were made
  v1-plan.md             What the first real release contains
```

### The one thing to know

`lib/` has a seam through it, and it is load-bearing.

`lib/tmdb.ts` speaks TMDB's language — snake_case payloads, image hosts, wire
types. `lib/media.ts` speaks the app's, and is the **only** module allowed to
map between the two. Everything in `app/` and `components/` imports from
`lib/media` and never from `lib/tmdb`.

The two change for different reasons: one when TMDB's API moves, the other
when the words on the page do. Keeping them apart is what let Watch Records
live somewhere that is not named after a third-party API.

`lib/auth.ts` has the same shape for the same reason. It owns Better Auth's
instance and the `user`-shaped session it returns, and exports `viewer()`;
`app/` and `components/` read the current Viewer through that and never reach
for a session themselves. `lib/media` never learns that Viewers exist.

See [`docs/adr/0003`](docs/adr/0003-tmdb-client-separate-from-domain.md) and
[`docs/adr/0005`](docs/adr/0005-the-viewer-lives-beside-the-domain.md).

## Language

The project keeps a glossary in [`CONTEXT.md`](CONTEXT.md), and it binds code
as much as prose — types, functions, route segments and filenames all use its
words. **Media**, **Show**, **Movie**, **Kind**, **Fact**, **Rating**,
**Matches**, **Visitor**, **Viewer**, **Watch Record**, **Planned**,
**Watched**, **Watchlist** and the rest each have one agreed meaning and a
list of words to avoid in their place.

A **Visitor** is anyone using BeStats; a **Viewer** is a Visitor who has
signed in. The distinction is load-bearing, because the marking controls
render for everyone and only the recording needs an account.

The exceptions are the vendors' own vocabularies. A Show is spelled `tv` in
code, in URLs and on the wire, because that is TMDB's word; Better Auth's
tables are `user`, `session` and `account` for the same reason. "Show" and
"Viewer" are the words the reader sees.

Read `CONTEXT.md` before naming anything.

## Testing

Vitest, in two projects, because the two suites have different rights.

`unit` is pure and runs on every commit. `integration` talks to a real Neon
branch and never runs on a commit — in CI it gets a branch of its own, created
for the run and dropped afterwards, which is also how every migration is
tested before it is merged.

A test sits beside its source: `lib/format.ts` is tested by
`lib/format.test.ts`. An integration test takes `.integration.test.ts`, which
is how the two projects tell each other's files apart. `@/` resolves in tests,
so an import in a test looks like an import anywhere else.

```bash
pnpm test:unit          # no database needed
pnpm test:integration   # needs DATABASE_URL
pnpm test               # both
```

Replacing Node's runner overturned a written rule, so it is recorded as such
in [`docs/adr/0008`](docs/adr/0008-vitest-replaces-the-node-test-runner.md).

## Conventions

Formatting, quote style, import order and strictness are enforced by
`biome.json` and `tsconfig.json` rather than by documentation. Beyond those:

- Hand-written code uses arrow-function consts, not `function` declarations.
- `components/` exports at the bottom; `lib/` exports inline; pages
  `export default` at the bottom.
- Exported functions and components carry explicit return types.
- `//` comments say **why**, not what. JSDoc goes on exported types and
  non-obvious functions.
- `components/ui/` is generated by shadcn onto [Base UI](https://base-ui.com),
  not Radix. Leave those files in their generated shape.
- A form that navigates uses `next/form`, not `<form>` — a native GET form
  reloads the document.

[`CLAUDE.md`](CLAUDE.md) carries the full set, including the standing rules
that must not be broken.

## Documentation

| File                            | What it is                                        |
| ------------------------------- | ------------------------------------------------- |
| [`CONTEXT.md`](CONTEXT.md)      | The glossary. Read before naming anything.        |
| [`CLAUDE.md`](CLAUDE.md)        | Commands, boundaries, conventions, standing rules |
| [`docs/adr/`](docs/adr)         | Decisions that were hard to reverse, and why      |
| [`docs/v1-plan.md`](docs/v1-plan.md) | What the first real release contains          |

The ADRs are short and worth reading in order — they explain why one route
serves both Kinds, why placeholder values are not facts, why the TMDB client
is separate from the domain, and why search is two requests rather than one.

## Roadmap

v1 turns BeStats from a TMDB browser into something that is yours: a **Viewer**
signs in and keeps **Watch Records** — Media they mean to watch, and Media they
have watched.

Sign-in works, and the schema that holds Watch Records is in place: Better
Auth over Google and GitHub, Neon Postgres with Drizzle, and a `watch_records`
table whose primary key is the Viewer, the Kind and the TMDB id together, so
the one-state-only invariant is the database's to keep.

Still to come: the rules and Server Actions that write a Watch Record, the
marking control on every card, and the `/watchlist` and `/watched` pages. A
Watch Record stores no copy of TMDB's data, so every fact on the page keeps
coming from TMDB.

The full plan, its trade-offs and its build order are in
[`docs/v1-plan.md`](docs/v1-plan.md).

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

All Media data and artwork come from [The Movie Database](https://www.themoviedb.org).
