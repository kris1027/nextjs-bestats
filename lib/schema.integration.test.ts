import { and, eq, sql } from 'drizzle-orm';
import { afterAll, expect, test } from 'vitest';

import { db } from '@/lib/db';
import { watchRecords } from '@/lib/schema';

/**
 * The invariant is the schema's to keep, not the writing code's, so these
 * assertions go through Drizzle to Postgres and never through `lib/watch`.
 * — `docs/adr/0007-watchlist-and-watched-are-one-record.md`
 */

/**
 * Viewers live in `neon_auth`, which Neon Auth owns and `lib/schema.ts`
 * therefore does not declare, so they are made in raw SQL here.
 */
const newViewer = async (): Promise<string> => {
  const email = `itest-${crypto.randomUUID()}@example.test`;

  const { rows } = await db.execute<{ id: string }>(sql`
    insert into neon_auth."user" (name, email, "emailVerified")
    values ('Integration Viewer', ${email}, false)
    returning id
  `);

  const id = rows[0]?.id;

  if (!id) throw new Error('neon_auth."user" insert returned no id');

  return id;
};

const dropViewer = async (id: string): Promise<void> => {
  await db.execute(sql`delete from neon_auth."user" where id = ${id}::uuid`);
};

const viewers: string[] = [];

const viewer = async (): Promise<string> => {
  const id = await newViewer();
  viewers.push(id);

  return id;
};

afterAll(async () => {
  for (const id of viewers) await dropViewer(id);
});

test('a Viewer cannot record the same Media twice', async () => {
  const viewerId = await viewer();

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
    .values({ viewerId, kind: 'tv', tmdbId: 1396, state: 'watched' });

  await dropViewer(viewerId);

  const left = await db
    .select()
    .from(watchRecords)
    .where(eq(watchRecords.viewerId, viewerId));

  expect(left).toEqual([]);
});
