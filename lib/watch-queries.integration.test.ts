import { eq } from 'drizzle-orm';
import { expect, test } from 'vitest';

import { db } from '@/lib/db';
import { watchRecords } from '@/lib/schema';
import { disposableViewers } from '@/lib/test-viewers';
import { PAGE_SIZE, watchKey } from '@/lib/watch';
import {
  clearWatchRecord,
  setWatchRecord,
  watchLookup,
  watchRecordsPage,
} from '@/lib/watch-queries';

const viewer = disposableViewers();

const GOT = { kind: 'tv', id: 1399 } as const;
const BREAKING_BAD = { kind: 'tv', id: 1396 } as const;
const HEAT = { kind: 'movie', id: 949 } as const;

test('setting a Watch Record creates it', async () => {
  const viewerId = await viewer();

  await setWatchRecord(viewerId, GOT, 'planned');

  const lookup = await watchLookup(viewerId, [GOT]);

  expect(lookup.get(watchKey(GOT.kind, GOT.id))).toBe('planned');
});

test('setting the other state moves the Watch Record rather than adding one', async () => {
  const viewerId = await viewer();

  await setWatchRecord(viewerId, GOT, 'planned');
  await setWatchRecord(viewerId, GOT, 'watched');

  const rows = await db
    .select()
    .from(watchRecords)
    .where(eq(watchRecords.viewerId, viewerId));

  expect(rows).toHaveLength(1);
  expect(rows[0]?.state).toBe('watched');
});

test('moving a Watch Record makes it the newest marking', async () => {
  const viewerId = await viewer();

  await setWatchRecord(viewerId, GOT, 'watched');
  await setWatchRecord(viewerId, BREAKING_BAD, 'watched');
  await setWatchRecord(viewerId, GOT, 'planned');
  await setWatchRecord(viewerId, GOT, 'watched');

  const { records } = await watchRecordsPage(viewerId, 'watched', 1);

  expect(records.map((record) => record.tmdbId)).toEqual([
    GOT.id,
    BREAKING_BAD.id,
  ]);
});

test('clearing a Watch Record deletes it', async () => {
  const viewerId = await viewer();

  await setWatchRecord(viewerId, GOT, 'watched');
  await clearWatchRecord(viewerId, GOT);

  const lookup = await watchLookup(viewerId, [GOT]);

  expect(lookup.get(watchKey(GOT.kind, GOT.id)) ?? null).toBe(null);
});

test('clearing Media with no Watch Record is not an error', async () => {
  const viewerId = await viewer();

  await expect(clearWatchRecord(viewerId, GOT)).resolves.toBeUndefined();
});

test('the lookup answers for the Media it was asked about and no other', async () => {
  const viewerId = await viewer();

  await setWatchRecord(viewerId, GOT, 'planned');
  await setWatchRecord(viewerId, BREAKING_BAD, 'watched');
  await setWatchRecord(viewerId, HEAT, 'watched');

  const lookup = await watchLookup(viewerId, [GOT, HEAT, { ...HEAT, id: 1 }]);

  expect([...lookup.entries()].sort()).toEqual([
    ['movie/949', 'watched'],
    ['tv/1399', 'planned'],
  ]);
});

test('the lookup keeps the same TMDB id in each Kind apart', async () => {
  const viewerId = await viewer();

  await setWatchRecord(viewerId, GOT, 'planned');
  await setWatchRecord(viewerId, { kind: 'movie', id: GOT.id }, 'watched');

  const lookup = await watchLookup(viewerId, [
    GOT,
    { kind: 'movie', id: GOT.id },
  ]);

  expect(lookup.get('tv/1399')).toBe('planned');
  expect(lookup.get('movie/1399')).toBe('watched');
});

test('the lookup is one Viewer’s and nobody else’s', async () => {
  const [one, other] = await Promise.all([viewer(), viewer()]);

  await setWatchRecord(one, GOT, 'watched');

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

  await setWatchRecord(viewerId, GOT, 'planned');
  await setWatchRecord(viewerId, BREAKING_BAD, 'watched');
  await setWatchRecord(viewerId, HEAT, 'watched');

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
    await setWatchRecord(viewerId, { kind: 'movie', id }, 'watched');
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

test('a Viewer with nothing recorded has an empty list, not a missing one', async () => {
  const viewerId = await viewer();

  await expect(watchRecordsPage(viewerId, 'planned', 1)).resolves.toEqual({
    records: [],
    total: 0,
  });
});
