import {
  type Absence,
  hasAired,
  type Kind,
  type ShowEpisodes,
} from '@/lib/media';
import {
  assertListPage,
  caughtUpAt,
  PAGE_SIZE,
  TRACKED_CEILING,
  type TrackedMedia,
  type UpNext,
  upNext,
} from '@/lib/watch';

/**
 * Where the lists place what a Viewer is tracking, from what TMDB says about
 * it. Pure, and kept out of `lib/watch.ts` because it reads
 * `hasAired` from `lib/media`, which reaches `lib/tmdb` and `next/cache` — a
 * client component imports `lib/watch.ts`, and nothing here is a client's.
 */

/**
 * The lists placed from TMDB's answers: the Watchlist and Upcoming, and the
 * Shows on the Watched list. Its Movies are Watch Records, paged in Postgres,
 * so nothing placed is ever a Movie on Watched.
 */
export type PlacedList = 'watchlist' | 'upcoming' | 'watched';

/**
 * What TMDB said about one tracked Movie or Show, as much as placing it
 * needs: a Movie's release day, a Show's seasons and whether it has ended, or
 * no answer to place it by. A Show whose seasons went Unanswered is Unanswered
 * here, whatever TMDB said about the Show itself.
 */
export type TrackedAnswer =
  | { answer: 'movie'; releaseDate: string | null }
  | ({ answer: 'show' } & ShowEpisodes)
  | { answer: Absence };

/**
 * A calendar day, `YYYY-MM-DD`, cut from a date TMDB spelled. Its own type
 * because Upcoming orders days by comparing them as strings, which is right
 * only once the day has been checked and cut to that shape — and only
 * `calendarDay` does both.
 */
export type CalendarDay = string & { readonly calendarDay: unique symbol };

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
  day: CalendarDay | null;
  /**
   * When the Viewer caught up with a Show, which is what Watched orders its
   * Shows by; `null` for anything they are not caught up with.
   */
  caughtUpAt: Date | null;
  /**
   * The lists it is on: one, or the Watchlist and Upcoming both where TMDB
   * gave nothing to place it by, since Unanswered is never an absence from
   * either. Never Watched then: what is left of a Show is TMDB's to say, and
   * calling the Viewer caught up without its answer is a claim about them.
   */
  lists: ReadonlySet<PlacedList>;
};

const WATCHLIST: ReadonlySet<PlacedList> = new Set(['watchlist']);
const UPCOMING: ReadonlySet<PlacedList> = new Set(['upcoming']);
const WATCHED: ReadonlySet<PlacedList> = new Set(['watched']);
const BOTH: ReadonlySet<PlacedList> = new Set(['watchlist', 'upcoming']);
const NONE: ReadonlySet<PlacedList> = new Set();

/** The latest marked first, which is the Watchlist's order and the ceiling's. */
const latestMarkedFirst = (a: TrackedMedia, b: TrackedMedia): number =>
  b.markedAt.getTime() - a.markedAt.getTime();

/**
 * The tracked Movies and Shows a list is placed from, and whether the ceiling
 * left any off — which the list says, since what it left off is on no page and
 * in no tally, and a finished Show is never marked again to climb back.
 */
export type WithinCeiling = { kept: TrackedMedia[]; cut: boolean };

/**
 * The tracked Movies and Shows a list is placed from: the latest marked, no
 * more than the ceiling. Cut before TMDB is asked, since the ceiling is what
 * bounds the asking.
 */
export const withinCeiling = (
  tracked: readonly TrackedMedia[],
): WithinCeiling => ({
  kept: [...tracked].sort(latestMarkedFirst).slice(0, TRACKED_CEILING),
  cut: tracked.length > TRACKED_CEILING,
});

/** A date TMDB spelled as the calendar day it names, or `null` for none. */
const calendarDay = (date: string | null): CalendarDay | null =>
  date !== null && !Number.isNaN(new Date(date).getTime())
    ? (date.slice(0, 10) as CalendarDay)
    : null;

/**
 * Places one tracked Movie or Show. What can be watched by `today` — a
 * released Movie, a Show whose next Episode has aired — is on the Watchlist;
 * what is waited for — an unreleased or undated Movie, a Show whose next
 * Episode has not aired or has no date, a Show with a later season announced
 * and no Episodes in it yet — is Upcoming; a Show the Viewer is caught up
 * with is on Watched and nowhere else, ended or still running.
 *
 * A Stopped Show is on no list, unless TMDB says it is Gone: its page is a
 * 404, so the card Gone Media gets on both lists is the one place left to
 * take its record back. One TMDB did not answer for still has a page.
 */
export const placed = (
  tracked: TrackedMedia,
  answer: TrackedAnswer,
  today: Date,
): PlacedMedia => {
  const placement = placedByAnswer(tracked, answer, today);

  return tracked.stopped && answer.answer !== 'gone'
    ? { ...placement, lists: NONE }
    : placement;
};

/** Places one tracked Movie or Show by TMDB's answer alone. */
const placedByAnswer = (
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
      caughtUpAt: null,
      lists: hasAired(answer.releaseDate, today) ? WATCHLIST : UPCOMING,
    };
  }

  if (answer.answer === 'show') {
    const next = upNext(answer.seasons, tracked.scored);
    const airDate = 'episode' in next ? next.airDate : null;
    const caught = caughtUpAt(answer, tracked.scored);

    return {
      tracked,
      placedBy: 'show',
      upNext: next,
      day: calendarDay(airDate),
      caughtUpAt: caught,
      lists: caught ? WATCHED : hasAired(airDate, today) ? WATCHLIST : UPCOMING,
    };
  }

  return {
    tracked,
    placedBy: answer.answer,
    upNext: null,
    day: null,
    caughtUpAt: null,
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

/**
 * The latest caught up with first, which is Watched's order for its Shows,
 * and the latest marked among those caught up with at one moment.
 */
const byLatestCaughtUp = (a: PlacedMedia, b: PlacedMedia): number =>
  (b.caughtUpAt?.getTime() ?? 0) - (a.caughtUpAt?.getTime() ?? 0) ||
  byLatestMarked(a, b);

const ORDERS: Record<PlacedList, (a: PlacedMedia, b: PlacedMedia) => number> = {
  watchlist: byLatestMarked,
  upcoming: bySoonest,
  watched: byLatestCaughtUp,
};

/** One Kind of one list, in that list's order. */
const onList = <T extends PlacedMedia>(
  media: readonly T[],
  list: PlacedList,
  kind: Kind,
): T[] =>
  media
    .filter((item) => item.lists.has(list) && item.tracked.ref.kind === kind)
    .sort(ORDERS[list]);

/**
 * One page of one Kind of a placed list, and that Kind's total, which the
 * page count is read off.
 */
export type PlacedPage<T extends PlacedMedia> = { items: T[]; total: number };

/**
 * One page of one Kind of a placed list. The items come back as they went in,
 * so whatever a caller placed alongside each one stays with it.
 */
export const placedPage = <T extends PlacedMedia>(
  media: readonly T[],
  list: PlacedList,
  { kind, page }: { kind: Kind; page: number },
): PlacedPage<T> => {
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
