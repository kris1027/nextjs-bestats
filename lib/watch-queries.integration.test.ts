import { eq } from 'drizzle-orm';
import { expect, test } from 'vitest';

import { db } from '@/lib/db';
import { markingTallies, watchRecords } from '@/lib/schema';
import { expireMarkingWindow } from '@/lib/test-marking';
import { disposableViewers } from '@/lib/test-viewers';
import { PAGE_SIZE, stateOf } from '@/lib/watch';
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

  await writeWatchRecord(viewerId, GOT, 'planned');

  const lookup = await watchLookup(viewerId, [GOT]);

  expect(stateOf(lookup, GOT)).toBe('planned');
});

test('writing the other state moves the Watch Record rather than adding one', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, 'planned');
  await writeWatchRecord(viewerId, GOT, 'watched');

  const rows = await db
    .select()
    .from(watchRecords)
    .where(eq(watchRecords.viewerId, viewerId));

  expect(rows).toHaveLength(1);
  expect(rows[0]?.state).toBe('watched');
});

test('moving a Watch Record makes it the newest marking', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, 'watched');
  await writeWatchRecord(viewerId, BREAKING_BAD, 'watched');
  await writeWatchRecord(viewerId, GOT, 'planned');
  await writeWatchRecord(viewerId, GOT, 'watched');

  const { records } = await watchRecordsPage(viewerId, 'watched', 1);

  expect(records.map((record) => record.tmdbId)).toEqual([
    GOT.id,
    BREAKING_BAD.id,
  ]);
});

test('clearing a Watch Record deletes it', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, 'watched');
  await clearWatchRecord(viewerId, GOT);

  const lookup = await watchLookup(viewerId, [GOT]);

  expect(stateOf(lookup, GOT)).toBe(null);
});

test('clearing Media with no Watch Record is not an error', async () => {
  const viewerId = await viewer();

  await expect(clearWatchRecord(viewerId, GOT)).resolves.toBeUndefined();
});

test('the lookup answers for the Media it was asked about and no other', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, 'planned');
  await writeWatchRecord(viewerId, BREAKING_BAD, 'watched');
  await writeWatchRecord(viewerId, HEAT, 'watched');

  const lookup = await watchLookup(viewerId, [GOT, HEAT, { ...HEAT, id: 1 }]);

  expect([...lookup.entries()].sort()).toEqual([
    ['movie/949', 'watched'],
    ['tv/1399', 'planned'],
  ]);
});

test('the lookup keeps the same TMDB id in each Kind apart', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, 'planned');
  await writeWatchRecord(viewerId, { kind: 'movie', id: GOT.id }, 'watched');

  const lookup = await watchLookup(viewerId, [
    GOT,
    { kind: 'movie', id: GOT.id },
  ]);

  expect(lookup.get('tv/1399')).toBe('planned');
  expect(lookup.get('movie/1399')).toBe('watched');
});

test('the lookup is one Viewer’s and nobody else’s', async () => {
  const [one, other] = await Promise.all([viewer(), viewer()]);

  await writeWatchRecord(one, GOT, 'watched');

  const lookup = await watchLookup(other, [GOT]);

  expect(lookup.size).toBe(0);
});

test('an empty page of Media asks nothing and gets nothing', async () => {
  const viewerId = await viewer();

  const lookup = await watchLookup(viewerId, []);

  expect(lookup.size).toBe(0);
});

test('a list holds one state and counts the whole of it', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, 'planned');
  await writeWatchRecord(viewerId, BREAKING_BAD, 'watched');
  await writeWatchRecord(viewerId, HEAT, 'watched');

  const watched = await watchRecordsPage(viewerId, 'watched', 1);
  const planned = await watchRecordsPage(viewerId, 'planned', 1);

  expect(watched.total).toBe(2);
  expect(watched.records.map((record) => record.state)).toEqual([
    'watched',
    'watched',
  ]);
  expect(planned.total).toBe(1);
  expect(planned.records.map((record) => record.tmdbId)).toEqual([GOT.id]);
});

test('a list pages at PAGE_SIZE, newest marking first', async () => {
  const viewerId = await viewer();
  const ids = Array.from({ length: PAGE_SIZE + 3 }, (_, i) => 1000 + i);

  // one at a time, so every `updated_at` is later than the one before
  for (const id of ids) {
    await writeWatchRecord(viewerId, { kind: 'movie', id }, 'watched');
  }

  const first = await watchRecordsPage(viewerId, 'watched', 1);
  const second = await watchRecordsPage(viewerId, 'watched', 2);
  const beyond = await watchRecordsPage(viewerId, 'watched', 3);

  expect(first.total).toBe(ids.length);
  expect(first.records).toHaveLength(PAGE_SIZE);
  expect(first.records[0]?.tmdbId).toBe(ids.at(-1));
  expect(second.records.map((record) => record.tmdbId)).toEqual(
    ids.slice(0, 3).reverse(),
  );
  expect(beyond.records).toEqual([]);
  expect(beyond.total).toBe(ids.length);
});

test('a list page that does not count from 1 is refused before Postgres sees it', async () => {
  const viewerId = await viewer();

  await expect(watchRecordsPage(viewerId, 'watched', 0)).rejects.toThrow(
    RangeError,
  );
  await expect(watchRecordsPage(viewerId, 'watched', -1)).rejects.toThrow(
    RangeError,
  );
  await expect(watchRecordsPage(viewerId, 'watched', 1.5)).rejects.toThrow(
    RangeError,
  );
});

test('a Viewer with nothing recorded has an empty list, not a missing one', async () => {
  const viewerId = await viewer();

  await expect(watchRecordsPage(viewerId, 'planned', 1)).resolves.toEqual({
    records: [],
    total: 0,
  });
});

test('the tallies count each state, and a state with nothing counts 0', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, 'planned');
  await writeWatchRecord(viewerId, BREAKING_BAD, 'planned');
  await writeWatchRecord(viewerId, HEAT, 'watched');

  expect(await watchTallies(viewerId)).toEqual({ planned: 2, watched: 1 });

  await clearWatchRecord(viewerId, HEAT);

  expect(await watchTallies(viewerId)).toEqual({ planned: 2, watched: 0 });
});

test('the tallies are one Viewer’s and nobody else’s', async () => {
  const [mine, theirs] = await Promise.all([viewer(), viewer()]);

  await writeWatchRecord(theirs, GOT, 'watched');

  expect(await watchTallies(mine)).toEqual({ planned: 0, watched: 0 });
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
