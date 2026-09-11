import { and, eq, sql } from 'drizzle-orm';
import { expect, test } from 'vitest';

import { db } from '@/lib/db';
import { watchRecords } from '@/lib/schema';
import { disposableViewers, dropViewer, newViewer } from '@/lib/test-viewers';

/**
 * The invariant is the schema's to keep, not the writing code's, so these
 * assertions go through Drizzle to Postgres and never through `lib/watch`.
 * — `docs/adr/0007-watchlist-and-watched-are-one-record.md`
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 */

const viewer = disposableViewers();

test('a Viewer cannot record the same Media twice', async () => {
  const viewerId = await viewer();

  await db
    .insert(watchRecords)
    .values({ viewerId, kind: 'tv', tmdbId: 1399, state: 'planned' });

  await expect(
    db.insert(watchRecords).values({
      viewerId,
      kind: 'tv',
      tmdbId: 1399,
      state: 'watched',
      score: 9,
    }),
  ).rejects.toThrow();
});

test('a Watched record without a Score is refused', async () => {
  const viewerId = await viewer();

  await expect(
    db
      .insert(watchRecords)
      .values({ viewerId, kind: 'tv', tmdbId: 1399, state: 'watched' }),
  ).rejects.toThrow();
});

test('a Planned record carrying a Score is refused', async () => {
  const viewerId = await viewer();

  await expect(
    db.insert(watchRecords).values({
      viewerId,
      kind: 'tv',
      tmdbId: 1399,
      state: 'planned',
      score: 9,
    }),
  ).rejects.toThrow();
});

test('a Score outside one to ten is refused at either end', async () => {
  const viewerId = await viewer();

  for (const score of [0, 11, -1]) {
    await expect(
      db.insert(watchRecords).values({
        viewerId,
        kind: 'tv',
        tmdbId: 1399,
        state: 'watched',
        score,
      }),
    ).rejects.toThrow();
  }
});

test('the same TMDB id in each Kind is two different Media', async () => {
  const viewerId = await viewer();

  await db.insert(watchRecords).values([
    { viewerId, kind: 'tv', tmdbId: 1399, state: 'planned' },
    { viewerId, kind: 'movie', tmdbId: 1399, state: 'planned' },
  ]);

  const rows = await db
    .select()
    .from(watchRecords)
    .where(
      and(eq(watchRecords.viewerId, viewerId), eq(watchRecords.tmdbId, 1399)),
    );

  expect(rows.map((row) => row.kind).sort()).toEqual(['movie', 'tv']);
});

test('a state that is neither Planned nor Watched is refused', async () => {
  const viewerId = await viewer();

  await expect(
    db.execute(sql`
      insert into watch_records (viewer_id, kind, tmdb_id, state)
      values (${viewerId}::uuid, 'tv', 66732, 'abandoned')
    `),
  ).rejects.toThrow();
});

test('a Watch Record cannot belong to nobody', async () => {
  await expect(
    db.insert(watchRecords).values({
      viewerId: '00000000-0000-0000-0000-000000000000',
      kind: 'tv',
      tmdbId: 1399,
      state: 'planned',
    }),
  ).rejects.toThrow();
});

test('deleting a Viewer takes their Watch Records with it', async () => {
  const viewerId = await newViewer();

  await db
    .insert(watchRecords)
    .values({ viewerId, kind: 'tv', tmdbId: 1396, state: 'watched', score: 9 });

  await dropViewer(viewerId);

  const left = await db
    .select()
    .from(watchRecords)
    .where(eq(watchRecords.viewerId, viewerId));

  expect(left).toEqual([]);
});
