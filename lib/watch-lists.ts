import {
  type Absence,
  hasAired,
  type Kind,
  type SeasonEpisodes,
} from '@/lib/media';
import {
  assertListPage,
  PAGE_SIZE,
  TRACKED_CEILING,
  type TrackedMedia,
  type UpNext,
  upNext,
} from '@/lib/watch';

/**
 * Where the Watchlist and Upcoming place what a Viewer is tracking, from what
 * TMDB says about it. Pure, and kept out of `lib/watch.ts` because it reads
 * `hasAired` from `lib/media`, which reaches `lib/tmdb` and `next/cache` — a
 * client component imports `lib/watch.ts`, and nothing here is a client's.
 * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
 */

/**
 * The lists placed from TMDB's answers. The Watched list is paged in Postgres.
 */
export type PlacedList = 'watchlist' | 'upcoming';

/**
 * What TMDB said about one tracked Movie or Show, as much as placing it
 * needs: a Movie's release day, a Show's seasons, or no answer to place it by.
 * A Show whose seasons went Unanswered is Unanswered here, whatever TMDB said
 * about the Show itself.
 */
export type TrackedAnswer =
  | { answer: 'movie'; releaseDate: string | null }
  | { answer: 'show'; seasons: readonly SeasonEpisodes[] }
  | { answer: Absence };

/** A tracked Movie or Show, placed. */
export type PlacedMedia = {
  tracked: TrackedMedia;
  /**
   * Which answer it was placed by, so a card can tell a Movie TMDB gave no
   * release day from one TMDB gave no answer for at all.
   */
  placedBy: TrackedAnswer['answer'];
  /** What the Viewer watches next in a Show; `null` for anything else. */
  upNext: UpNext | null;
  /**
   * The calendar day Upcoming orders by: the next Episode's air day or the
   * Movie's release day, as TMDB spells it. `null` is undated, which is also
   * what a Show the Viewer is caught up with and an absent answer are.
   */
  day: string | null;
  /**
   * The lists it is on: one, or both where TMDB gave nothing to place it by,
   * since Unanswered is never an absence from either.
   */
  lists: ReadonlySet<PlacedList>;
};

const WATCHLIST: ReadonlySet<PlacedList> = new Set(['watchlist']);
const UPCOMING: ReadonlySet<PlacedList> = new Set(['upcoming']);
const BOTH: ReadonlySet<PlacedList> = new Set(['watchlist', 'upcoming']);

/** The latest marked first, which is the Watchlist's order and the ceiling's. */
const latestMarkedFirst = (a: TrackedMedia, b: TrackedMedia): number =>
  b.markedAt.getTime() - a.markedAt.getTime();

/**
 * The tracked Movies and Shows a list is placed from: the latest marked, no
 * more than the ceiling. Cut before TMDB is asked, since the ceiling is what
 * bounds the asking.
 */
export const withinCeiling = (
  tracked: readonly TrackedMedia[],
): TrackedMedia[] =>
  [...tracked].sort(latestMarkedFirst).slice(0, TRACKED_CEILING);

/** A date TMDB spelled as the calendar day it names, or `null` for none. */
const calendarDay = (date: string | null): string | null =>
  date !== null && !Number.isNaN(new Date(date).getTime())
    ? date.slice(0, 10)
    : null;

/**
 * Places one tracked Movie or Show. What can be watched by `today` — a
 * released Movie, a Show whose next Episode has aired — is on the Watchlist;
 * what is waited for — an unreleased or undated Movie, a Show whose next
 * Episode has not aired or has no date, a Show the Viewer is caught up with —
 * is Upcoming.
 */
export const placed = (
  tracked: TrackedMedia,
  answer: TrackedAnswer,
  today: Date,
): PlacedMedia => {
  if (answer.answer === 'movie') {
    return {
      tracked,
      placedBy: 'movie',
      upNext: null,
      day: calendarDay(answer.releaseDate),
      lists: hasAired(answer.releaseDate, today) ? WATCHLIST : UPCOMING,
    };
  }

  if (answer.answer === 'show') {
    const next = upNext(answer.seasons, tracked.scored);
    const airDate = 'episode' in next ? next.airDate : null;

    return {
      tracked,
      placedBy: 'show',
      upNext: next,
      day: calendarDay(airDate),
      lists: hasAired(airDate, today) ? WATCHLIST : UPCOMING,
    };
  }

  return {
    tracked,
    placedBy: answer.answer,
    upNext: null,
    day: null,
    lists: BOTH,
  };
};

const byLatestMarked = (a: PlacedMedia, b: PlacedMedia): number =>
  latestMarkedFirst(a.tracked, b.tracked);

/**
 * The soonest day first and the undated last, which is Upcoming's order; a
 * day shared, and the undated among themselves, the latest marked first.
 */
const bySoonest = (a: PlacedMedia, b: PlacedMedia): number => {
  if (a.day === b.day) return byLatestMarked(a, b);
  if (a.day === null) return 1;
  if (b.day === null) return -1;

  return a.day < b.day ? -1 : 1;
};

const ORDERS: Record<PlacedList, (a: PlacedMedia, b: PlacedMedia) => number> = {
  watchlist: byLatestMarked,
  upcoming: bySoonest,
};

/** One Kind of one list, in that list's order. */
const onList = (
  media: readonly PlacedMedia[],
  list: PlacedList,
  kind: Kind,
): PlacedMedia[] =>
  media
    .filter((item) => item.lists.has(list) && item.tracked.ref.kind === kind)
    .sort(ORDERS[list]);

/**
 * One page of one Kind of a placed list, and that Kind's total, which the
 * page count is read off.
 */
export type PlacedPage = { items: PlacedMedia[]; total: number };

/** One page of one Kind of the Watchlist or Upcoming. */
export const placedPage = (
  media: readonly PlacedMedia[],
  list: PlacedList,
  { kind, page }: { kind: Kind; page: number },
): PlacedPage => {
  assertListPage(page);

  const open = onList(media, list, kind);

  return {
    items: open.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: open.length,
  };
};

/**
 * What a placed list's tabs wear: how many of each Kind are on it, counted
 * from the set its pages are cut from.
 */
export const placedTallies = (
  media: readonly PlacedMedia[],
  list: PlacedList,
): Record<Kind, number> => ({
  tv: onList(media, list, 'tv').length,
  movie: onList(media, list, 'movie').length,
});
