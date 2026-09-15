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
  STOPPED,
  TRACKED_CEILING,
  watchedAt,
} from '@/lib/watch';
import {
  answeredEpisodeLookup,
  answeredShowEpisodeLookup,
  clearEpisodeRecord,
  clearWatchRecord,
  episodeLookup,
  showEpisodeLookup,
  tallyMarking,
  trackedMedia,
  watchedMovieCount,
  watchedMoviesPage,
  watchLookup,
  writeEpisodeRecord,
  writePlannedShow,
  writeStoppedShow,
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

  const { records } = await watchedMoviesPage(viewerId, 1);

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

test('the Watched Movies page holds only Watched Movies, and counts the whole of them', async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, GOT, PLANNED);
  await writeWatchRecord(viewerId, { kind: 'movie', id: GOT.id }, watchedAt(7));
  await writeWatchRecord(viewerId, ALIEN, PLANNED);
  await writeWatchRecord(viewerId, HEAT, watchedAt(9));

  const { records, total } = await watchedMoviesPage(viewerId, 1);

  // the Planned Movie and the Planned Show are in neither the records nor the
  // total, and a Movie sharing the Show's TMDB id is a Movie all the same
  expect(total).toBe(2);
  expect(records.map(({ kind, tmdbId }) => ({ kind, tmdbId }))).toEqual([
    { kind: 'movie', tmdbId: HEAT.id },
    { kind: 'movie', tmdbId: GOT.id },
  ]);
});

test('a list pages at PAGE_SIZE, newest marking first', async () => {
  const viewerId = await viewer();
  const ids = Array.from({ length: PAGE_SIZE + 3 }, (_, i) => 1000 + i);

  // one at a time, so every `updated_at` is later than the one before
  for (const id of ids) {
    await writeWatchRecord(viewerId, { kind: 'movie', id }, watchedAt(9));
  }

  const first = await watchedMoviesPage(viewerId, 1);
  const second = await watchedMoviesPage(viewerId, 2);
  const beyond = await watchedMoviesPage(viewerId, 3);

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

  const { records } = await watchedMoviesPage(viewerId, 1);

  expect(records[0]).toMatchObject({ state: 'watched', score: 4 });
});

test('a list page that does not count from 1 is refused before Postgres sees it', async () => {
  const viewerId = await viewer();

  await expect(watchedMoviesPage(viewerId, 0)).rejects.toThrow(RangeError);
  await expect(watchedMoviesPage(viewerId, -1)).rejects.toThrow(RangeError);
  await expect(watchedMoviesPage(viewerId, 1.5)).rejects.toThrow(RangeError);
});

test('a Viewer with nothing recorded has an empty list, not a missing one', async () => {
  const viewerId = await viewer();

  await expect(watchedMoviesPage(viewerId, 1)).resolves.toEqual({
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
const SEVERANCE = { kind: 'tv', id: HALF_LOOP.showId } as const;

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

  expect(await writePlannedShow(viewerId, SEVERANCE.id)).toBe(true);
  expect(
    markingOf(await watchLookup(viewerId, [SEVERANCE]), SEVERANCE),
  ).toEqual(PLANNED);

  await clearWatchRecord(viewerId, SEVERANCE);
  await writeEpisodeRecord(viewerId, HALF_LOOP, watchedAt(8));

  // refused in the statement that would have written it, so nothing is left
  expect(await writePlannedShow(viewerId, SEVERANCE.id)).toBe(false);
  expect((await watchLookup(viewerId, [SEVERANCE])).size).toBe(0);
});

test('a Show is written Stopped only once one of its Episodes is scored', async () => {
  const viewerId = await viewer();

  // refused in the statement that would have written it, as Planned is
  expect(await writeStoppedShow(viewerId, SEVERANCE.id)).toBe(false);
  expect((await watchLookup(viewerId, [SEVERANCE])).size).toBe(0);

  await writeEpisodeRecord(viewerId, HALF_LOOP, watchedAt(8));

  expect(await writeStoppedShow(viewerId, SEVERANCE.id)).toBe(true);
  expect(
    markingOf(await watchLookup(viewerId, [SEVERANCE]), SEVERANCE),
  ).toEqual(STOPPED);
});

test("scoring an Episode deletes its Show's record, Planned or Stopped", async () => {
  const viewerId = await viewer();

  await writeWatchRecord(viewerId, SEVERANCE, STOPPED);
  await writeEpisodeRecord(viewerId, HALF_LOOP, watchedAt(8));

  expect((await watchLookup(viewerId, [SEVERANCE])).size).toBe(0);
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

test("a Show's Episode lookup holds every Score its Episodes have, latest first, and no other Show's", async () => {
  const viewerId = await viewer();
  const otherShow = { episodeId: 63056, showId: GOT.id };

  await writeEpisodeRecord(viewerId, HALF_LOOP, watchedAt(8));
  await writeEpisodeRecord(viewerId, otherShow, watchedAt(5));
  await writeEpisodeRecord(viewerId, IN_PERPETUITY, watchedAt(6));

  expect([...(await showEpisodeLookup(viewerId, HALF_LOOP.showId))]).toEqual([
    [IN_PERPETUITY.episodeId, watchedAt(6)],
    [HALF_LOOP.episodeId, watchedAt(8)],
  ]);
});

test("one Viewer's Episodes of a Show are not another's", async () => {
  const scored = await viewer();
  const other = await viewer();

  await writeEpisodeRecord(scored, HALF_LOOP, watchedAt(8));

  expect((await showEpisodeLookup(other, HALF_LOOP.showId)).size).toBe(0);
});

test("a Visitor has an empty lookup of a Show's Episodes and an Unanswered sign-in has none", async () => {
  expect(
    (await answeredShowEpisodeLookup({ answer: 'visitor' }, HALF_LOOP.showId))
      .markings?.size,
  ).toBe(0);
  expect(
    (
      await answeredShowEpisodeLookup(
        { answer: 'unanswered' },
        HALF_LOOP.showId,
      )
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

test('a Stopped Show comes flagged, however many of its Episodes are scored', async () => {
  const viewerId = await viewer();

  await writeEpisodeRecord(
    viewerId,
    { episodeId: 62085, showId: 1396 },
    watchedAt(8),
  );
  await writeWatchRecord(viewerId, BREAKING_BAD, STOPPED);
  await writeWatchRecord(viewerId, GOT, STOPPED);
  await writeWatchRecord(viewerId, HEAT, PLANNED);

  // flagged rather than left out, since only TMDB can say one is Gone; the
  // Show with no Episodes scored comes too, Stopped all the same
  const stopped = (await trackedMedia(viewerId)).map((item) => ({
    ref: item.ref,
    stopped: item.stopped,
  }));

  expect(stopped).toEqual(
    expect.arrayContaining([
      { ref: BREAKING_BAD, stopped: true },
      { ref: GOT, stopped: true },
      { ref: HEAT, stopped: false },
    ]),
  );
  expect(stopped).toHaveLength(3);
});

test('tracked Media comes latest marked first, and stops one past the ceiling', async () => {
  const viewerId = await viewer();

  // Movie n is marked n minutes into the day, so Movie 1 is the oldest
  await db.insert(watchRecords).values(
    Array.from({ length: TRACKED_CEILING + 2 }, (_, index) => ({
      viewerId,
      kind: 'movie' as const,
      tmdbId: index + 1,
      state: 'planned' as const,
      updatedAt: new Date(Date.UTC(2026, 8, 1, 0, index + 1)),
    })),
  );

  const tracked = await trackedMedia(viewerId);

  // one past, so a list can say the ceiling cut it short
  expect(tracked).toHaveLength(201);
  expect(tracked[0]?.ref).toEqual({ kind: 'movie', id: 202 });
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
