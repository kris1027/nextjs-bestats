import { and, count, desc, eq, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { watchRecords } from '@/lib/schema';
import {
  type MediaRef,
  PAGE_SIZE,
  toLookup,
  type WatchLookup,
  type WatchRecordsPage,
  type WatchState,
} from '@/lib/watch';

/**
 * The reads and writes behind `lib/watch`, and the only file in it that
 * touches the database. Every function takes the Viewer's id as its first
 * argument and never decides who that is: the action reads it from the
 * session, and a page reads it the same way.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 */

/** The `where` clause that names one piece of Media: `(kind, tmdb_id) = (…)`. */
const whereMedia = (ref: MediaRef) =>
  and(eq(watchRecords.kind, ref.kind), eq(watchRecords.tmdbId, ref.id));

/**
 * The states one Viewer holds for the Media on one page, in one query. Keyed
 * by the page rather than fetching the Viewer's whole history, so the cost
 * belongs to the page — forty rows at most on Trending — and not to how much
 * the Viewer has watched.
 */
export const watchLookup = async (
  viewerId: string,
  refs: readonly MediaRef[],
): Promise<WatchLookup> => {
  // nothing to ask for, so nothing is asked
  if (refs.length === 0) return toLookup([]);

  const rows = await db
    .select({
      kind: watchRecords.kind,
      tmdbId: watchRecords.tmdbId,
      state: watchRecords.state,
    })
    .from(watchRecords)
    .where(
      and(eq(watchRecords.viewerId, viewerId), or(...refs.map(whereMedia))),
    );

  return toLookup(rows);
};

/**
 * `watchLookup` for a page. A database that does not answer is Unanswered
 * rather than an exception: the page hands its cards `null`, they render no
 * control, and the TMDB half of the page renders as if nothing had happened —
 * the two sources fail apart. The cause is logged here because nothing
 * downstream carries it. The action keeps `watchLookup` itself, because it
 * has a message of its own to return.
 *
 * `viewerId` is `null` for a Visitor who has not signed in, and then nothing
 * is asked: no Viewer means no Watch Record, which is an empty lookup — a
 * real absence — and not an Unanswered one. Said here once rather than as a
 * ternary on every page.
 */
export const answeredWatchLookup = async (
  viewerId: string | null,
  refs: readonly MediaRef[],
): Promise<WatchLookup | null> => {
  if (viewerId === null) return toLookup([]);

  try {
    return await watchLookup(viewerId, refs);
  } catch (cause) {
    console.error('Watch Records went Unanswered:', cause);

    return null;
  }
};

/**
 * One page of a Viewer's list in one state — the Watchlist, or the Watched
 * list — newest marking first, with the size of the whole list beside it so
 * the page can say "20 of 214" the way it does for Matches. `page` counts
 * from 1, the way the address bar does, and anything else is refused here
 * rather than handed to Postgres as a negative offset: `?page=` is the
 * page's to validate, and this is where forgetting to would surface. The two
 * queries are issued together because neither needs the other.
 */
export const watchRecordsPage = async (
  viewerId: string,
  state: WatchState,
  page: number,
): Promise<WatchRecordsPage> => {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError(`A list page counts from 1, not ${page}`);
  }

  const inState = and(
    eq(watchRecords.viewerId, viewerId),
    eq(watchRecords.state, state),
  );

  const [records, [tally]] = await Promise.all([
    db
      .select({
        kind: watchRecords.kind,
        tmdbId: watchRecords.tmdbId,
        state: watchRecords.state,
        updatedAt: watchRecords.updatedAt,
      })
      .from(watchRecords)
      .where(inState)
      .orderBy(desc(watchRecords.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(watchRecords).where(inState),
  ]);

  return { records, total: tally?.total ?? 0 };
};

/**
 * The write half of marking: the Watch Record for a piece of Media, in
 * `state`, whether or not one existed. One statement: the primary key is the
 * triple, so a second marking is
 * a conflict that becomes the move. `updated_at` is set here by hand, because
 * Drizzle's `$onUpdate` fires for `update` and not for an upsert — and set
 * from Postgres's clock, not this process's, so a move and an insert are
 * ordered by the one clock the lists sort on.
 * — `docs/adr/0007-watchlist-and-watched-are-one-record.md`
 */
export const writeWatchRecord = async (
  viewerId: string,
  ref: MediaRef,
  state: WatchState,
): Promise<void> => {
  await db
    .insert(watchRecords)
    .values({ viewerId, kind: ref.kind, tmdbId: ref.id, state })
    .onConflictDoUpdate({
      target: [watchRecords.viewerId, watchRecords.kind, watchRecords.tmdbId],
      set: { state, updatedAt: sql`now()` },
    });
};

/** Unmarks: the row goes, because there is no third state to leave it in. */
export const clearWatchRecord = async (
  viewerId: string,
  ref: MediaRef,
): Promise<void> => {
  await db
    .delete(watchRecords)
    .where(and(eq(watchRecords.viewerId, viewerId), whereMedia(ref)));
};
