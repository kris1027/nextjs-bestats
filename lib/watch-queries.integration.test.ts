import { eq } from 'drizzle-orm';
import { expect, test } from 'vitest';

import { db } from '@/lib/db';
import { markingTallies, watchRecords } from '@/lib/schema';
import { expireMarkingWindow } from '@/lib/test-marking';
import { disposableViewers } from '@/lib/test-viewers';
import { markingOf, PAGE_SIZE, PLANNED, watchedAt } from '@/lib/watch';
import {
  clearWatchRecord,
  tallyMarking,
  watchLookup,
  watchRecordsPage,
  watchTallies,
  writeWatchRecord,
} from '@/lib/watch-queries';

const viewer = disposableViewers();

const GOT = { kind: 'tv', id: 1399 } as const;
const BREAKING_BAD = { kind: 'tv', id: 1396 } as const;
const HEAT = { kind: 'movie', id: 949 } as const;

test('writing a Watch Record creates it', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);

  const lookup = await watchLookup(viewerId, [GOT]);

  expect(markingOf(lookup, GOT)).toEqual(PLANNED);
});

test('writing the other state moves the Watch Record rather than adding one', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, GOT, watchedAt(9));

  const rows = await db
    .select()
    .from(watchRecords)
    .where(eq(watchRecords.viewerId, viewerId));

  expect(rows).toHaveLength(1);
  expect(rows[0]?.state).toBe('watched');
  expect(rows[0]?.score).toBe(9);
});

test('rescoring a Watch Record replaces the Score it held', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, watchedAt(3));
  await writeWatchRecord(viewerId, GOT, watchedAt(10));

  const lookup = await watchLookup(viewerId, [GOT]);

  expect(markingOf(lookup, GOT)).toEqual(watchedAt(10));
});

test('moving a Watch Record back to Planned takes the Score with it', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, watchedAt(9));
  await writeWatchRecord(viewerId, GOT, PLANNED);

  const rows = await db
    .select()
    .from(watchRecords)
    .where(eq(watchRecords.viewerId, viewerId));

  // the check constraint would have refused the row otherwise, which is the
  // schema catching a forgotten `score: null` rather than a reader having to
  expect(rows[0]?.state).toBe('planned');
  expect(rows[0]?.score).toBe(null);
});

test('moving a Watch Record makes it the newest marking', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, watchedAt(9));
  await writeWatchRecord(viewerId, BREAKING_BAD, watchedAt(9));
  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, GOT, watchedAt(9));

  const { records } = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind: 'tv',
    page: 1,
  });

  expect(records.map((record) => record.tmdbId)).toEqual([
    GOT.id,
    BREAKING_BAD.id,
  ]);
});

test('clearing a Watch Record deletes it', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, watchedAt(9));
  await clearWatchRecord(viewerId, GOT);

  const lookup = await watchLookup(viewerId, [GOT]);

  expect(markingOf(lookup, GOT)).toBe(null);
});

test('clearing Media with no Watch Record is not an error', async () => {
  const viewerId = await viewer();

  await expect(clearWatchRecord(viewerId, GOT)).resolves.toBeUndefined();
});

test('the lookup answers for the Media it was asked about and no other', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, BREAKING_BAD, watchedAt(9));
  await writeWatchRecord(viewerId, HEAT, watchedAt(9));

  const lookup = await watchLookup(viewerId, [GOT, HEAT, { ...HEAT, id: 1 }]);

  expect([...lookup.entries()].sort()).toEqual([
    ['movie/949', watchedAt(9)],
    ['tv/1399', PLANNED],
  ]);
});

test('the lookup keeps the same TMDB id in each Kind apart', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, { kind: 'movie', id: GOT.id }, watchedAt(9));

  const lookup = await watchLookup(viewerId, [
    GOT,
    { kind: 'movie', id: GOT.id },
  ]);

  expect(lookup.get('tv/1399')).toEqual(PLANNED);
  expect(lookup.get('movie/1399')).toEqual(watchedAt(9));
});

test('the lookup is one Viewer’s and nobody else’s', async () => {
  const [one, other] = await Promise.all([viewer(), viewer()]);

  await writeWatchRecord(one, GOT, watchedAt(9));

  const lookup = await watchLookup(other, [GOT]);

  expect(lookup.size).toBe(0);
});

test('an empty page of Media asks nothing and gets nothing', async () => {
  const viewerId = await viewer();

  const lookup = await watchLookup(viewerId, []);

  expect(lookup.size).toBe(0);
});

test('a list holds one state and one Kind, and counts the whole of that', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, BREAKING_BAD, watchedAt(9));
  await writeWatchRecord(viewerId, HEAT, watchedAt(9));

  const watchedShows = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind: 'tv',
    page: 1,
  });
  const watchedMovies = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind: 'movie',
    page: 1,
  });
  const plannedShows = await watchRecordsPage(viewerId, {
    state: 'planned',
    kind: 'tv',
    page: 1,
  });

  // the Movie this Viewer has watched is behind the other tab, and is neither
  // in this tab's records nor in the total it pages through
  expect(watchedShows.total).toBe(1);
  expect(watchedShows.records.map((record) => record.tmdbId)).toEqual([
    BREAKING_BAD.id,
  ]);
  expect(watchedMovies.total).toBe(1);
  expect(watchedMovies.records.map((record) => record.tmdbId)).toEqual([
    HEAT.id,
  ]);
  expect(plannedShows.total).toBe(1);
  expect(plannedShows.records.map((record) => record.tmdbId)).toEqual([GOT.id]);
});

test('the same TMDB id in each Kind is two rows on two tabs', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, { kind: 'movie', id: GOT.id }, PLANNED);

  const shows = await watchRecordsPage(viewerId, {
    state: 'planned',
    kind: 'tv',
    page: 1,
  });
  const movies = await watchRecordsPage(viewerId, {
    state: 'planned',
    kind: 'movie',
    page: 1,
  });

  expect(shows.records.map((record) => record.kind)).toEqual(['tv']);
  expect(movies.records.map((record) => record.kind)).toEqual(['movie']);
});

test('a list pages at PAGE_SIZE, newest marking first', async () => {
  const viewerId = await viewer();
  const ids = Array.from({ length: PAGE_SIZE + 3 }, (_, i) => 1000 + i);

  // one at a time, so every `updated_at` is later than the one before
  for (const id of ids) {
    await writeWatchRecord(viewerId, { kind: 'movie', id }, watchedAt(9));
  }

  const first = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind: 'movie',
    page: 1,
  });
  const second = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind: 'movie',
    page: 2,
  });
  const beyond = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind: 'movie',
    page: 3,
  });

  expect(first.total).toBe(ids.length);
  expect(first.records).toHaveLength(PAGE_SIZE);
  expect(first.records[0]?.tmdbId).toBe(ids.at(-1));
  expect(second.records.map((record) => record.tmdbId)).toEqual(
    ids.slice(0, 3).reverse(),
  );
  expect(beyond.records).toEqual([]);
  expect(beyond.total).toBe(ids.length);
});

test('a list carries each record’s Score, which is what its card shows', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, watchedAt(4));

  const { records } = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind: 'tv',
    page: 1,
  });

  expect(records[0]).toMatchObject({ state: 'watched', score: 4 });
});

test('a list page that does not count from 1 is refused before Postgres sees it', async () => {
  const viewerId = await viewer();

  await expect(
    watchRecordsPage(viewerId, {
      state: 'watched',
      kind: 'tv',
      page: 0,
    }),
  ).rejects.toThrow(RangeError);
  await expect(
    watchRecordsPage(viewerId, {
      state: 'watched',
      kind: 'tv',
      page: -1,
    }),
  ).rejects.toThrow(RangeError);
  await expect(
    watchRecordsPage(viewerId, {
      state: 'watched',
      kind: 'tv',
      page: 1.5,
    }),
  ).rejects.toThrow(RangeError);
});

test('a Viewer with nothing recorded has an empty list, not a missing one', async () => {
  const viewerId = await viewer();

  await expect(
    watchRecordsPage(viewerId, {
      state: 'planned',
      kind: 'tv',
      page: 1,
    }),
  ).resolves.toEqual({
    records: [],
    total: 0,
  });
});

test('the tallies split each state by Kind, and a pair with nothing counts 0', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, BREAKING_BAD, PLANNED);
  await writeWatchRecord(viewerId, HEAT, watchedAt(9));

  expect(await watchTallies(viewerId)).toEqual({
    planned: { tv: 2, movie: 0 },
    watched: { tv: 0, movie: 1 },
  });

  await clearWatchRecord(viewerId, HEAT);

  expect(await watchTallies(viewerId)).toEqual({
    planned: { tv: 2, movie: 0 },
    watched: { tv: 0, movie: 0 },
  });
});

test('the tallies are one Viewer’s and nobody else’s', async () => {
  const [mine, theirs] = await Promise.all([viewer(), viewer()]);

  await writeWatchRecord(theirs, GOT, watchedAt(9));

  expect(await watchTallies(mine)).toEqual({
    planned: { tv: 0, movie: 0 },
    watched: { tv: 0, movie: 0 },
  });
});

test('counting a marking starts at 1 and climbs within the minute', async () => {
  const viewerId = await viewer();

  expect(await tallyMarking(viewerId)).toBe(1);
  expect(await tallyMarking(viewerId)).toBe(2);
  expect(await tallyMarking(viewerId)).toBe(3);
});

test('a minute after the window started, counting starts over', async () => {
  const viewerId = await viewer();

  await tallyMarking(viewerId);
  await tallyMarking(viewerId);

  await expireMarkingWindow(viewerId);

  expect(await tallyMarking(viewerId)).toBe(1);
});

test('a marking tally is one Viewer’s, and one row however many presses', async () => {
  const [mine, theirs] = await Promise.all([viewer(), viewer()]);

  await tallyMarking(theirs);
  await tallyMarking(theirs);

  expect(await tallyMarking(mine)).toBe(1);

  const rows = await db
    .select()
    .from(markingTallies)
    .where(eq(markingTallies.viewerId, theirs));

  expect(rows).toHaveLength(1);
});
