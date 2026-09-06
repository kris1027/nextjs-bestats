import type { Kind, MediaRef } from '@/lib/media';

/**
 * The rules that move a Watch Record between states, and nothing that touches
 * a database. This file is the half of `lib/watch` a client component may
 * import: step 4's control runs `marked` for `useOptimistic`, so nothing here
 * may reach for `lib/db`, whose import throws without `DATABASE_URL`. The
 * queries live in `lib/watch-queries.ts` and the Server Action in
 * `lib/watch-actions.ts`.
 */

/**
 * The two states, in the order a Viewer moves through them. `WatchState` is
 * read off this list rather than declared beside it, and the Postgres enum in
 * `lib/schema.ts` satisfies it, so the domain and the database cannot drift.
 */
export const WATCH_STATES = ['planned', 'watched'] as const;

/** Planned or Watched, and never a third thing. */
export type WatchState = (typeof WATCH_STATES)[number];

/** Guards a state that arrives as an opaque string, such as a form field. */
export const isWatchState = (value: string): value is WatchState =>
  WATCH_STATES.some((state) => state === value);

/**
 * One Viewer's recorded relationship to one piece of Media, as much of the
 * row as anything outside the queries needs. The Viewer is not on it: a
 * record is always read for one Viewer, so carrying the id would only invite
 * a page to compare it against something.
 * — `docs/adr/0007-watchlist-and-watched-are-one-record.md`
 */
export type WatchRecord = {
  kind: Kind;
  tmdbId: number;
  state: WatchState;
  /** The moment of the last marking, which is what the lists order by. */
  updatedAt: Date;
};

/**
 * What marking does. Pressing the state a Watch Record already has unmarks it
 * — `null`, no record — and pressing the other moves it. `null` in is a piece
 * of Media the Viewer has said nothing about, which the glossary is careful to
 * call no state at all rather than a third one.
 *
 * Pure, because it runs twice for every press: on the server against the row
 * as it really is, and on the client for the optimistic flip.
 */
export const marked = (
  current: WatchState | null,
  pressed: WatchState,
): WatchState | null => (current === pressed ? null : pressed);

/**
 * The two lists, one per state: where each lives and the word it wears. The
 * Watchlist is the Planned list and the glossary's own word for it; the
 * Watched list has no word but Watched. One row per state, like `KIND_WORDS`,
 * so the header's links, the tabs and the routes cannot drift apart.
 */
export const LISTS: Record<WatchState, { path: string; label: string }> = {
  planned: { path: '/watchlist', label: 'Watchlist' },
  watched: { path: '/watched', label: 'Watched' },
};

/**
 * The key a page's lookup is built on: `tv/1399`, the spelling of the URL and
 * of the ADRs. Written once here because a TMDB id is unique only within a
 * Kind, and a lookup keyed on the id alone would let a Show answer for a
 * Movie. Takes a `MediaRef`, which a Media Item already is.
 */
export const watchKey = ({ kind, id }: MediaRef): string => `${kind}/${id}`;

/** What a page hands its cards: each piece of Media's state, by `watchKey`. */
export type WatchLookup = ReadonlyMap<string, WatchState>;

/**
 * The ref a Watch Record names: the same pair, spelled the way `lib/media`
 * spells it. A record says `tmdbId` because the column does; everything that
 * asks TMDB says `id`. Said once here rather than at every seam between them.
 */
export const refOf = (
  record: Pick<WatchRecord, 'kind' | 'tmdbId'>,
): MediaRef => ({ kind: record.kind, id: record.tmdbId });

/**
 * Builds the lookup from one query's rows. A piece of Media with no row is
 * simply absent, which `stateOf` reads as `null`.
 */
export const toLookup = (
  records: readonly Pick<WatchRecord, 'kind' | 'tmdbId' | 'state'>[],
): WatchLookup =>
  new Map(records.map((record) => [watchKey(refOf(record)), record.state]));

/**
 * A piece of Media's state in a lookup, or `null` when the Viewer has said
 * nothing about it — the glossary's "no Watch Record at all", not a third
 * state. Said here once so no caller has to remember the `?? null`.
 */
export const stateOf = (
  lookup: WatchLookup,
  ref: MediaRef,
): WatchState | null => lookup.get(watchKey(ref)) ?? null;

/**
 * How many Watch Records a list page shows. Each one costs a TMDB request, so
 * the page bounds that cost whatever a Viewer has watched, and twenty is the
 * page size TMDB uses everywhere else in the app.
 * — `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
 */
export const PAGE_SIZE = 20;

/**
 * How many presses of a marking control one Viewer gets in a minute before
 * the action refuses the next. A person pressing as fast as they can stays
 * under it; a loop does not. It guards Neon's compute against a runaway
 * client, so it is set where a false refusal on a real press cannot happen.
 */
export const MARKS_PER_MINUTE = 60;

/** One page of a Viewer's list, and how many the list holds in all. */
export type WatchRecordsPage = {
  records: WatchRecord[];
  total: number;
};
