import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { db } from '@/lib/db';
import { user, watchRecords } from '@/lib/schema';

/**
 * The invariant is the schema's to keep, not the writing code's, so these
 * assertions go through Drizzle to Postgres and never through `lib/watch`.
 * — `docs/adr/0007-watchlist-and-watched-are-one-record.md`
 */

const newViewer = async (): Promise<string> => {
  const id = `test-${randomUUID()}`;

  await db
    .insert(user)
    .values({ id, name: 'Integration Viewer', email: `${id}@example.test` });

  return id;
};

let viewerId: string;

beforeAll(async () => {
  viewerId = await newViewer();
});

afterAll(async () => {
  await db.delete(user).where(eq(user.id, viewerId));
});

test('a Viewer cannot record the same Media twice', async () => {
  await db
    .insert(watchRecords)
    .values({ viewerId, kind: 'tv', tmdbId: 1399, state: 'planned' });

  await expect(
    db
      .insert(watchRecords)
      .values({ viewerId, kind: 'tv', tmdbId: 1399, state: 'watched' }),
  ).rejects.toThrow();
});

test('the same TMDB id in each Kind is two different Media', async () => {
  await db
    .insert(watchRecords)
    .values({ viewerId, kind: 'movie', tmdbId: 1399, state: 'planned' });

  const rows = await db
    .select()
    .from(watchRecords)
    .where(
      and(eq(watchRecords.viewerId, viewerId), eq(watchRecords.tmdbId, 1399)),
    );

  expect(rows.map((row) => row.kind).sort()).toEqual(['movie', 'tv']);
});

test('a state that is neither Planned nor Watched is refused', async () => {
  await expect(
    db.execute(sql`
      insert into watch_records (viewer_id, kind, tmdb_id, state)
      values (${viewerId}, 'tv', 66732, 'abandoned')
    `),
  ).rejects.toThrow();
});

test('deleting a Viewer takes their Watch Records with it', async () => {
  const doomed = await newViewer();

  await db
    .insert(watchRecords)
    .values({ viewerId: doomed, kind: 'tv', tmdbId: 1396, state: 'watched' });

  await db.delete(user).where(eq(user.id, doomed));

  const left = await db
    .select()
    .from(watchRecords)
    .where(eq(watchRecords.viewerId, doomed));

  expect(left).toEqual([]);
});
