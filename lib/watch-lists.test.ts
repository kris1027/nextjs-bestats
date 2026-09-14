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

// days counted from the end of August 2026, so a later day is a later marking
const tracked = (
  kind: Kind,
  id: number,
  day: number,
  scored: number[] = [],
): TrackedMedia => ({
  ref: { kind, id },
  markedAt: new Date(Date.UTC(2026, 8, day)),
  scored: new Set(scored),
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

test('a Show whose next Episode has no air day is Upcoming, undated', () => {
  const found = placed(
    tracked('tv', 1, 1, [101]),
    show(season(1, ['2026-01-01']), season(2, [null])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['upcoming']);
  expect(found.day).toBe(null);
});

test('a Planned Show that has not started airing is Upcoming', () => {
  const found = placed(
    tracked('tv', 1, 1),
    show(season(1, ['2026-10-01'])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['upcoming']);
});

test('a Show the Viewer is caught up with is Upcoming, undated, at the season announced', () => {
  const found = placed(
    tracked('tv', 1, 1, [101]),
    show(season(1, ['2026-01-01']), season(2, [])),
    TODAY,
  );

  expect(listsOf(found)).toEqual(['upcoming']);
  expect(found.day).toBe(null);
  expect(found.upNext).toEqual({ season: 2 });
});

test('Media TMDB did not answer for, or that is Gone, is on both lists', () => {
  for (const answer of ['gone', 'unanswered'] as const) {
    const found = placed(tracked('tv', 1, 1), { answer }, TODAY);

    expect(listsOf(found)).toEqual(['upcoming', 'watchlist']);
    expect(found.day).toBe(null);
  }
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

  const kept = withinCeiling(media);

  expect(TRACKED_CEILING).toBe(200);
  expect(kept).toHaveLength(200);
  expect(kept.some((item) => item.ref.kind === 'movie')).toBe(false);
  expect(kept[0]?.ref.id).toBe(201);
});
