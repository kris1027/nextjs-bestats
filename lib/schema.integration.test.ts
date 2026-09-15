import { and, eq, sql } from 'drizzle-orm';
import { expect, test } from 'vitest';

import { db } from '@/lib/db';
import { episodeRecords, watchRecords } from '@/lib/schema';
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
    .values({ viewerId, kind: 'movie', tmdbId: 949, state: 'planned' });

  await expect(
    db.insert(watchRecords).values({
      viewerId,
      kind: 'movie',
      tmdbId: 949,
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
      .values({ viewerId, kind: 'movie', tmdbId: 949, state: 'watched' }),
  ).rejects.toThrow();
});

test('a Watched Show is refused, whatever its Score', async () => {
  const viewerId = await viewer();

  // a Show is followed through its Episodes, so the Score a Viewer gives is an
  // Episode's; the same row for a Movie is the one the Watched list holds
  await expect(
    db.insert(watchRecords).values({
      viewerId,
      kind: 'tv',
      tmdbId: 1399,
      state: 'watched',
      score: 9,
    }),
  ).rejects.toThrow();
  await expect(
    db.insert(watchRecords).values({
      viewerId,
      kind: 'movie',
      tmdbId: 1399,
      state: 'watched',
      score: 9,
    }),
  ).resolves.not.toThrow();
});

test('a Stopped Movie is refused, and a Stopped Show is not', async () => {
  const viewerId = await viewer();

  // a Movie is watched once, so there is nothing partway through to give up
  // on; the same row for a Show is how a Viewer stops one
  await expect(
    db
      .insert(watchRecords)
      .values({ viewerId, kind: 'movie', tmdbId: 1399, state: 'stopped' }),
  ).rejects.toThrow();
  await expect(
    db
      .insert(watchRecords)
      .values({ viewerId, kind: 'tv', tmdbId: 1399, state: 'stopped' }),
  ).resolves.not.toThrow();
});

test('a Stopped record carrying a Score is refused', async () => {
  const viewerId = await viewer();

  await expect(
    db.insert(watchRecords).values({
      viewerId,
      kind: 'tv',
      tmdbId: 1399,
      state: 'stopped',
      score: 9,
    }),
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
        kind: 'movie',
        tmdbId: 949,
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

test('a state that is not Planned, Watched or Stopped is refused', async () => {
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

  await db.insert(watchRecords).values({
    viewerId,
    kind: 'movie',
    tmdbId: 949,
    state: 'watched',
    score: 9,
  });

  await dropViewer(viewerId);

  const left = await db
    .select()
    .from(watchRecords)
    .where(eq(watchRecords.viewerId, viewerId));

  expect(left).toEqual([]);
});

// Severance S1E2: an Episode's own TMDB id, and the Show it belongs to
const HALF_LOOP = { episodeId: 3396429, showId: 95396 };

test('an Episode record without a Score is refused', async () => {
  const viewerId = await viewer();

  await expect(
    db.execute(sql`
      insert into episode_records (viewer_id, episode_id, show_id)
      values (${viewerId}::uuid, ${HALF_LOOP.episodeId}, ${HALF_LOOP.showId})
    `),
  ).rejects.toThrow();
});

test("an Episode record's Score outside one to ten is refused at either end", async () => {
  const viewerId = await viewer();

  for (const score of [0, 11, -1]) {
    await expect(
      db.insert(episodeRecords).values({ viewerId, ...HALF_LOOP, score }),
    ).rejects.toThrow();
  }
});

test('a Viewer cannot record the same Episode twice', async () => {
  const viewerId = await viewer();

  await db.insert(episodeRecords).values({ viewerId, ...HALF_LOOP, score: 8 });

  await expect(
    db.insert(episodeRecords).values({ viewerId, ...HALF_LOOP, score: 9 }),
  ).rejects.toThrow();
});

test('deleting a Viewer takes their Episode records with it', async () => {
  const viewerId = await newViewer();

  await db.insert(episodeRecords).values({ viewerId, ...HALF_LOOP, score: 8 });

  await dropViewer(viewerId);

  const left = await db
    .select()
    .from(episodeRecords)
    .where(eq(episodeRecords.viewerId, viewerId));

  expect(left).toEqual([]);
});
