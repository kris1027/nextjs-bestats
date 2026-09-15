import { and, eq } from 'drizzle-orm';
import { expect, test } from 'vitest';

import { db } from '@/lib/db';
import { episodeRecords, markingTallies, watchRecords } from '@/lib/schema';
import { expireMarkingWindow } from '@/lib/test-marking';
import { disposableViewers } from '@/lib/test-viewers';
import {
  episodeMarkingOf,
  markingOf,
  PAGE_SIZE,
  PLANNED,
  TRACKED_CEILING,
  watchedAt,
} from '@/lib/watch';
import {
  answeredEpisodeLookup,
  clearEpisodeRecord,
  clearWatchRecord,
  episodeLookup,
  tallyMarking,
  trackedMedia,
  watchedMovieCount,
  watchLookup,
  watchRecordsPage,
  writeEpisodeRecord,
  writePlannedShow,
  writeWatchRecord,
} from '@/lib/watch-queries';

const viewer = disposableViewers();

const GOT = { kind: 'tv', id: 1399 } as const;
const BREAKING_BAD = { kind: 'tv', id: 1396 } as const;
const HEAT = { kind: 'movie', id: 949 } as const;
const ALIEN = { kind: 'movie', id: 348 } as const;

test('writing a Watch Record creates it', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);

  const lookup = await watchLookup(viewerId, [GOT]);

  expect(markingOf(lookup, GOT)).toEqual(PLANNED);
});

test('writing the other state moves the Watch Record rather than adding one', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, HEAT, PLANNED);
  await writeWatchRecord(viewerId, HEAT, watchedAt(9));

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

  await writeWatchRecord(viewerId, HEAT, watchedAt(3));
  await writeWatchRecord(viewerId, HEAT, watchedAt(10));

  const lookup = await watchLookup(viewerId, [HEAT]);

  expect(markingOf(lookup, HEAT)).toEqual(watchedAt(10));
});

test('moving a Watch Record back to Planned takes the Score with it', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, HEAT, watchedAt(9));
  await writeWatchRecord(viewerId, HEAT, PLANNED);

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

  await writeWatchRecord(viewerId, HEAT, watchedAt(9));
  await writeWatchRecord(viewerId, ALIEN, watchedAt(9));
  await writeWatchRecord(viewerId, HEAT, PLANNED);
  await writeWatchRecord(viewerId, HEAT, watchedAt(9));

  const { records } = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind: 'movie',
    page: 1,
  });

  expect(records.map((record) => record.tmdbId)).toEqual([HEAT.id, ALIEN.id]);
});

test('clearing a Watch Record deletes it', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, HEAT, watchedAt(9));
  await clearWatchRecord(viewerId, HEAT);

  const lookup = await watchLookup(viewerId, [HEAT]);

  expect(markingOf(lookup, HEAT)).toBe(null);
});

test('clearing Media with no Watch Record is not an error', async () => {
  const viewerId = await viewer();

  await expect(clearWatchRecord(viewerId, GOT)).resolves.toBeUndefined();
});

test('the lookup answers for the Media it was asked about and no other', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, BREAKING_BAD, PLANNED);
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

  await writeWatchRecord(one, HEAT, watchedAt(9));

  const lookup = await watchLookup(other, [HEAT]);

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
  await writeWatchRecord(viewerId, ALIEN, PLANNED);
  await writeWatchRecord(viewerId, HEAT, watchedAt(9));

  const plannedMovies = await watchRecordsPage(viewerId, {
    state: 'planned',
    kind: 'movie',
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

  // the Movie this Viewer has watched is in the other state, and is neither
  // in this list's records nor in the total it pages through
  expect(plannedMovies.total).toBe(1);
  expect(plannedMovies.records.map((record) => record.tmdbId)).toEqual([
    ALIEN.id,
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

  await writeWatchRecord(viewerId, HEAT, watchedAt(4));

  const { records } = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind: 'movie',
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

test('the Watched Movie count leaves Planned out, and is 0 once there are none', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, ALIEN, PLANNED);
  await writeWatchRecord(viewerId, HEAT, watchedAt(9));

  expect(await watchedMovieCount(viewerId)).toBe(1);

  await clearWatchRecord(viewerId, HEAT);

  expect(await watchedMovieCount(viewerId)).toBe(0);
});

test('the Watched Movie count is one Viewer’s and nobody else’s', async () => {
  const [mine, theirs] = await Promise.all([viewer(), viewer()]);

  await writeWatchRecord(theirs, HEAT, watchedAt(9));

  expect(await watchedMovieCount(mine)).toBe(0);
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

const HALF_LOOP = { episodeId: 3396429, showId: 95396 };
const IN_PERPETUITY = { episodeId: 3396430, showId: 95396 };

test('an Episode lookup holds the Scores of the Episodes asked for, and only those', async () => {
  const viewerId = await viewer();

  await writeEpisodeRecord(viewerId, HALF_LOOP, watchedAt(8));
  await writeEpisodeRecord(viewerId, IN_PERPETUITY, watchedAt(6));

  const lookup = await episodeLookup(viewerId, [HALF_LOOP.episodeId]);

  expect(episodeMarkingOf(lookup, HALF_LOOP.episodeId)).toEqual(watchedAt(8));
  expect(episodeMarkingOf(lookup, IN_PERPETUITY.episodeId)).toBeNull();
});

test('writing an Episode record again rescores it, and clearing it removes it', async () => {
  const viewerId = await viewer();

  await writeEpisodeRecord(viewerId, HALF_LOOP, watchedAt(8));
  await writeEpisodeRecord(viewerId, HALF_LOOP, watchedAt(2));

  expect(
    episodeMarkingOf(
      await episodeLookup(viewerId, [HALF_LOOP.episodeId]),
      HALF_LOOP.episodeId,
    ),
  ).toEqual(watchedAt(2));

  await clearEpisodeRecord(viewerId, HALF_LOOP.episodeId);

  expect((await episodeLookup(viewerId, [HALF_LOOP.episodeId])).size).toBe(0);
});

test('a Show is written Planned only while none of its Episodes is scored', async () => {
  const viewerId = await viewer();
  const show = { kind: 'tv', id: HALF_LOOP.showId } as const;

  expect(await writePlannedShow(viewerId, show.id)).toBe(true);
  expect(markingOf(await watchLookup(viewerId, [show]), show)).toEqual(PLANNED);

  await clearWatchRecord(viewerId, show);
  await writeEpisodeRecord(viewerId, HALF_LOOP, watchedAt(8));

  // refused in the statement that would have written it, so nothing is left
  expect(await writePlannedShow(viewerId, show.id)).toBe(false);
  expect((await watchLookup(viewerId, [show])).size).toBe(0);
});

test("another Show's scored Episodes do not refuse Planned on this one", async () => {
  const viewerId = await viewer();

  await writeEpisodeRecord(viewerId, HALF_LOOP, watchedAt(8));

  expect(await writePlannedShow(viewerId, GOT.id)).toBe(true);
});

test("one Viewer's Episode Scores are not another's", async () => {
  const scored = await viewer();
  const other = await viewer();

  await writeEpisodeRecord(scored, HALF_LOOP, watchedAt(8));

  expect((await episodeLookup(other, [HALF_LOOP.episodeId])).size).toBe(0);
});

test('a Visitor has an empty Episode lookup and an Unanswered sign-in has none', async () => {
  expect(
    (await answeredEpisodeLookup({ answer: 'visitor' }, [HALF_LOOP.episodeId]))
      .markings?.size,
  ).toBe(0);
  expect(
    (
      await answeredEpisodeLookup({ answer: 'unanswered' }, [
        HALF_LOOP.episodeId,
      ])
    ).markings,
  ).toBeNull();
});

/** A tracked row as a test compares it: which Media, and what was scored. */
const trackedOf = async (viewerId: string) =>
  (await trackedMedia(viewerId)).map(({ ref, scored }) => ({
    ref,
    scored: [...scored.keys()].sort(),
  }));

test('Planned Movies and Shows are tracked, and a Watched Movie is not', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, HEAT, PLANNED);
  await writeWatchRecord(viewerId, { kind: 'movie', id: 603 }, watchedAt(9));

  expect(await trackedOf(viewerId)).toEqual(
    expect.arrayContaining([
      { ref: GOT, scored: [] },
      { ref: HEAT, scored: [] },
    ]),
  );
  expect(await trackedOf(viewerId)).toHaveLength(2);
});

/** Moves one Episode record's last marking to a known moment. */
const episodeMarkedAt = async (
  viewerId: string,
  episodeId: number,
  at: string,
): Promise<void> => {
  await db
    .update(episodeRecords)
    .set({ updatedAt: new Date(at) })
    .where(
      and(
        eq(episodeRecords.viewerId, viewerId),
        eq(episodeRecords.episodeId, episodeId),
      ),
    );
};

test('a Show under way is tracked with when each Episode was scored, at the latest of them', async () => {
  const viewerId = await viewer();

  await writeEpisodeRecord(
    viewerId,
    { episodeId: 62085, showId: 1396 },
    watchedAt(8),
  );
  await writeEpisodeRecord(
    viewerId,
    { episodeId: 62086, showId: 1396 },
    watchedAt(9),
  );
  await episodeMarkedAt(viewerId, 62085, '2026-09-10T12:00:00Z');
  await episodeMarkedAt(viewerId, 62086, '2026-09-02T12:00:00Z');

  const [show, ...rest] = await trackedMedia(viewerId);

  expect(rest).toEqual([]);
  expect(show?.ref).toEqual(BREAKING_BAD);
  expect(show?.scored).toEqual(
    new Map([
      [62085, new Date('2026-09-10T12:00:00Z')],
      [62086, new Date('2026-09-02T12:00:00Z')],
    ]),
  );
  expect(show?.markedAt).toEqual(new Date('2026-09-10T12:00:00Z'));
});

test('tracked Media comes latest marked first, and stops at the ceiling', async () => {
  const viewerId = await viewer();

  // Movie n is marked n minutes into the day, so Movie 1 is the oldest
  await db.insert(watchRecords).values(
    Array.from({ length: TRACKED_CEILING + 1 }, (_, index) => ({
      viewerId,
      kind: 'movie' as const,
      tmdbId: index + 1,
      state: 'planned' as const,
      updatedAt: new Date(Date.UTC(2026, 8, 1, 0, index + 1)),
    })),
  );

  const tracked = await trackedMedia(viewerId);

  expect(tracked).toHaveLength(200);
  expect(tracked[0]?.ref).toEqual({ kind: 'movie', id: 201 });
  expect(tracked.at(-1)?.ref).toEqual({ kind: 'movie', id: 2 });
});

test('tracked Media is one Viewer’s and nobody else’s', async () => {
  const viewerId = await viewer();
  const otherId = await viewer();

  await writeWatchRecord(otherId, HEAT, PLANNED);
  await writeEpisodeRecord(
    otherId,
    { episodeId: 62085, showId: 1396 },
    watchedAt(8),
  );

  expect(await trackedMedia(viewerId)).toEqual([]);
});
