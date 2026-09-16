import { expect, test } from 'vitest';

import type { Kind, SeasonEpisodes } from '@/lib/media';
import { PAGE_SIZE, TRACKED_CEILING, type TrackedMedia } from '@/lib/watch';
import {
  type PlacedMedia,
  placed,
  placedPage,
  placedTallies,
  type TrackedAnswer,
  withinCeiling,
} from '@/lib/watch-lists';

// every placement below is read on this day
const TODAY = new Date(Date.UTC(2026, 8, 14));

// days counted from the end of August 2026, so a later day is a later
// marking; each Episode is scored on the day the Media was last marked
const tracked = (
  kind: Kind,
  id: number,
  day: number,
  scored: number[] = [],
): TrackedMedia => ({
  ref: { kind, id },
  markedAt: new Date(Date.UTC(2026, 8, day)),
  scored: new Map(
    scored.map((episodeId) => [episodeId, new Date(Date.UTC(2026, 8, day))]),
  ),
  stopped: false,
});

// Episode ids are season * 100 + number, so a failure names the Episode
const season = (
  number: number,
  airDates: (string | null)[],
): SeasonEpisodes => ({
  number,
  episodes: airDates.map((airDate, index) => ({
    id: number * 100 + index + 1,
    number: index + 1,
    airDate,
  })),
});

const movie = (releaseDate: string | null): TrackedAnswer => ({
  answer: 'movie',
  releaseDate,
});

const show = (...seasons: SeasonEpisodes[]): TrackedAnswer => ({
  answer: 'show',
  ended: false,
  seasons,
});

/** A Show TMDB says has ended, `Ended` or `Canceled`. */
const ended = (...seasons: SeasonEpisodes[]): TrackedAnswer => ({
  answer: 'show',
  ended: true,
  seasons,
});

const listsOf = (item: PlacedMedia): string[] => [...item.lists].sort();

test('a released Movie is on the Watchlist, and one released today is too', () => {
  const media = tracked('movie', 1, 1);

  expect(listsOf(placed(media, movie('2026-03-12'), TODAY))).toEqual([
    'watchlist',
  ]);
  expect(listsOf(placed(media, movie('2026-09-14'), TODAY))).toEqual([
    'watchlist',
  ]);
});

test('an unreleased Movie is Upcoming at its release day', () => {
  const found = placed(tracked('movie', 1, 1), movie('2026-11-20'), TODAY);

  expect(listsOf(found)).toEqual(['upcoming']);
  expect(found.day).toBe('2026-11-20');
});

test('a Movie TMDB has no release day for is Upcoming, undated', () => {
  const found = placed(tracked('movie', 1, 1), movie(null), TODAY);

  expect(listsOf(found)).toEqual(['upcoming']);
  expect(found.day).toBe(null);
});

test('a Show whose next Episode has aired is on the Watchlist at that Episode', () => {
  const found = placed(
    tracked('tv', 1, 1, [101]),
    show(season(1, ['2026-01-01', '2026-01-08'])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['watchlist']);
  expect(found.upNext).toEqual({
    episode: { season: 1, episode: 2 },
    airDate: '2026-01-08',
  });
});

test('a Show whose next Episode has not aired is Upcoming at its air day', () => {
  const found = placed(
    tracked('tv', 1, 1, [101]),
    show(season(1, ['2026-01-01']), season(2, ['2027-03-12'])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['upcoming']);
  expect(found.day).toBe('2027-03-12');
});

test('a Show whose next Episode has no air day is on Watched, not waited for', () => {
  const found = placed(
    tracked('tv', 1, 1, [101]),
    show(season(1, ['2026-01-01']), season(2, [null])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['watched']);
  expect(found.caughtUpAt).toEqual(new Date(Date.UTC(2026, 8, 1)));
  // the Episode is still what the card names, now on Watched
  expect(found.upNext).toEqual({
    episode: { season: 2, episode: 1 },
    airDate: null,
  });
});

test('a Planned Show that has not started airing is Upcoming', () => {
  const found = placed(
    tracked('tv', 1, 1),
    show(season(1, ['2026-10-01'])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['upcoming']);
});

test('a Show with a season announced and no Episodes yet is on Watched', () => {
  const found = placed(
    tracked('tv', 1, 1, [101]),
    show(season(1, ['2026-01-01']), season(2, [])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['watched']);
  expect(found.caughtUpAt).toEqual(new Date(Date.UTC(2026, 8, 1)));
  // the season is still what the card names, now on Watched
  expect(found.upNext).toEqual({ season: 2 });
});

test('a Show whose later Episode has a day is Upcoming, not on Watched', () => {
  // S2E1 is undated and S2E2 airs next month: the Show is airing, so reading
  // the next Episode alone would hide it on Watched
  const season2: SeasonEpisodes = {
    number: 2,
    episodes: [
      { id: 201, number: 1, airDate: null },
      { id: 202, number: 2, airDate: '2026-10-01' },
    ],
  };
  const found = placed(
    tracked('tv', 1, 1, [101]),
    {
      answer: 'show',
      ended: false,
      seasons: [season(1, ['2026-01-01']), season2],
    },
    TODAY,
  );

  expect(listsOf(found)).toEqual(['upcoming']);
  expect(found.caughtUpAt).toBe(null);
  // undated, since the Episode the Viewer is actually waiting on has no day
  expect(found.day).toBe(null);
});

test('nothing undated is left on Upcoming for a Show the Viewer has started', () => {
  // the one rule the lists read: a day ahead is Upcoming, no day is Watched
  const started = tracked('tv', 1, 1, [101]);

  for (const answer of [
    show(season(1, ['2026-01-01']), season(2, [null])),
    show(season(1, ['2026-01-01']), season(2, [])),
    show(season(1, ['2026-01-01'])),
    ended(season(1, ['2026-01-01'])),
  ]) {
    expect(listsOf(placed(started, answer, TODAY))).toEqual(['watched']);
  }

  const dated = show(season(1, ['2026-01-01']), season(2, ['2027-03-12']));

  expect(listsOf(placed(started, dated, TODAY))).toEqual(['upcoming']);
});

test('a Show the Viewer is caught up with is on Watched alone, at that moment', () => {
  const found = placed(
    tracked('tv', 1, 5, [101, 102]),
    ended(season(1, ['2026-01-01', '2026-01-08'])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['watched']);
  expect(found.caughtUpAt).toEqual(new Date(Date.UTC(2026, 8, 5)));
});

test('an ended Show with a dated final Episode still to air stays Upcoming', () => {
  const found = placed(
    tracked('tv', 1, 1, [101]),
    ended(season(1, ['2026-01-01', '2026-10-01'])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['upcoming']);
  expect(found.day).toBe('2026-10-01');
  expect(found.caughtUpAt).toBe(null);
});

test('a Show still running with nothing left is on Watched, not waited for', () => {
  // `Returning Series`, or a status TMDB has not used before: `hasEnded` reads
  // it, and anything but Ended or Canceled arrives here as not ended
  const found = placed(
    tracked('tv', 1, 1, [101]),
    show(season(1, ['2026-01-01'])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['watched']);
  expect(found.caughtUpAt).toEqual(new Date(Date.UTC(2026, 8, 1)));
});

test('Watched puts the latest caught up with first, whatever was marked since', () => {
  // Show 1 was caught up with on day 3 and its first Episode rescored on day
  // 9; Show 2 was caught up with on day 6
  const rescored: TrackedMedia = {
    ref: { kind: 'tv', id: 1 },
    markedAt: new Date(Date.UTC(2026, 8, 9)),
    scored: new Map([
      [101, new Date(Date.UTC(2026, 8, 9))],
      [102, new Date(Date.UTC(2026, 8, 3))],
    ]),
    stopped: false,
  };
  const media = [
    placed(rescored, ended(season(1, ['2026-01-01', '2026-01-08'])), TODAY),
    placed(tracked('tv', 2, 6, [101]), ended(season(1, ['2026-01-01'])), TODAY),
  ];

  const { items } = placedPage(media, 'watched', { kind: 'tv', page: 1 });

  expect(items.map((item) => item.tracked.ref.id)).toEqual([2, 1]);
  expect(placedTallies(media, 'watched')).toEqual({ tv: 2, movie: 0 });
  expect(placedTallies(media, 'upcoming')).toEqual({ tv: 0, movie: 0 });
});

test('Media TMDB did not answer for, or that is Gone, is on both lists', () => {
  for (const answer of ['gone', 'unanswered'] as const) {
    const found = placed(tracked('tv', 1, 1), { answer }, TODAY);

    // and never on Watched, since what is left of a Show is TMDB's to say
    expect(listsOf(found)).toEqual(['upcoming', 'watchlist']);
    expect(found.day).toBe(null);
  }
});

test('a Stopped Show is on no list, whatever TMDB answered for it', () => {
  const stopped = { ...tracked('tv', 1, 1, [101]), stopped: true };

  for (const answer of [
    show(season(1, ['2026-01-01', '2026-01-08'])),
    show(season(1, ['2026-01-01', '2026-10-01'])),
    ended(season(1, ['2026-01-01'])),
    { answer: 'unanswered' } as const,
  ]) {
    expect(listsOf(placed(stopped, answer, TODAY))).toEqual([]);
  }
});

test('a Stopped Show that is Gone is on both lists, so its card can take it back', () => {
  const stopped = { ...tracked('tv', 1, 1, [101]), stopped: true };

  expect(listsOf(placed(stopped, { answer: 'gone' }, TODAY))).toEqual([
    'upcoming',
    'watchlist',
  ]);
});

test('Upcoming puts the soonest first and the undated last, latest marked among them', () => {
  const media = [
    placed(tracked('movie', 1, 9), movie(null), TODAY),
    placed(tracked('movie', 2, 1), movie('2027-01-05'), TODAY),
    placed(tracked('movie', 3, 3), movie(null), TODAY),
    placed(tracked('movie', 4, 5), movie('2026-10-01'), TODAY),
    placed(tracked('movie', 5, 2), { answer: 'unanswered' }, TODAY),
  ];

  const { items } = placedPage(media, 'upcoming', { kind: 'movie', page: 1 });

  expect(items.map((item) => item.tracked.ref.id)).toEqual([4, 2, 1, 3, 5]);
});

test('Upcoming puts the latest marked first among those waited for on one day', () => {
  const media = [
    placed(tracked('movie', 1, 3), movie('2026-10-01'), TODAY),
    placed(tracked('movie', 2, 7), movie('2026-10-01'), TODAY),
  ];

  const { items } = placedPage(media, 'upcoming', { kind: 'movie', page: 1 });

  expect(items.map((item) => item.tracked.ref.id)).toEqual([2, 1]);
});

test('the Watchlist puts the latest marked first, whatever the release days', () => {
  const media = [
    placed(tracked('movie', 1, 3), movie('2020-01-01'), TODAY),
    placed(tracked('movie', 2, 9), movie('2025-01-01'), TODAY),
    placed(tracked('movie', 3, 5), movie('2010-01-01'), TODAY),
  ];

  const { items } = placedPage(media, 'watchlist', { kind: 'movie', page: 1 });

  expect(items.map((item) => item.tracked.ref.id)).toEqual([2, 3, 1]);
});

test('a list shows one Kind, and tallies both from what is placed on it', () => {
  const media = [
    placed(tracked('movie', 1, 1), movie('2020-01-01'), TODAY),
    placed(tracked('movie', 2, 2), movie('2027-01-01'), TODAY),
    placed(tracked('tv', 3, 3), { answer: 'gone' }, TODAY),
  ];

  const { items, total } = placedPage(media, 'upcoming', {
    kind: 'movie',
    page: 1,
  });

  expect(items.map((item) => item.tracked.ref)).toEqual([
    { kind: 'movie', id: 2 },
  ]);
  expect(total).toBe(1);
  expect(placedTallies(media, 'upcoming')).toEqual({ tv: 1, movie: 1 });
  expect(placedTallies(media, 'watchlist')).toEqual({ tv: 1, movie: 1 });
});

test('a placed list pages twenty at a time and counts every page', () => {
  // marked on days 1 to 25, so day 25 is the first and day 1 the last
  const media = Array.from({ length: 25 }, (_, index) =>
    placed(tracked('movie', index + 1, index + 1), movie('2020-01-01'), TODAY),
  );

  const first = placedPage(media, 'watchlist', { kind: 'movie', page: 1 });
  const second = placedPage(media, 'watchlist', { kind: 'movie', page: 2 });

  expect(PAGE_SIZE).toBe(20);
  expect(first.items).toHaveLength(20);
  expect(second.items.map((item) => item.tracked.ref.id)).toEqual([
    5, 4, 3, 2, 1,
  ]);
  expect(second.total).toBe(25);
});

test('a placed list page counts from 1', () => {
  const media = [placed(tracked('movie', 1, 1), movie(null), TODAY)];

  expect(() =>
    placedPage(media, 'upcoming', { kind: 'movie', page: 0 }),
  ).toThrow(RangeError);
});

test('the lists are placed from the 200 latest marked', () => {
  // the Movie is the least recently marked of 201
  const media = [
    tracked('movie', 1, 1),
    ...Array.from({ length: 200 }, (_, index) =>
      tracked('tv', index + 2, index + 2),
    ),
  ];

  const { kept, cut } = withinCeiling(media);

  expect(TRACKED_CEILING).toBe(200);
  expect(kept).toHaveLength(200);
  expect(kept.some((item) => item.ref.kind === 'movie')).toBe(false);
  expect(kept[0]?.ref.id).toBe(201);
  expect(cut).toBe(true);
});

test('a list of exactly 200 tracked is not cut short', () => {
  const media = Array.from({ length: 200 }, (_, index) =>
    tracked('movie', index + 1, index + 1),
  );

  expect(withinCeiling(media).cut).toBe(false);
});
