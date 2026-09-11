import { and, count, desc, eq, or, sql } from 'drizzle-orm';

import type { ViewerAnswer } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Kind, MediaRef } from '@/lib/media';
import { markingTallies, watchRecords } from '@/lib/schema';
import { viewerKeyOf } from '@/lib/viewer-key';
import {
  type Marking,
  PAGE_SIZE,
  scoreOf,
  toLookup,
  toMarkedMedia,
  type ViewerLookup,
  type WatchLookup,
  type WatchRecordsPage,
  type WatchState,
  type WatchTallies,
} from '@/lib/watch';

/**
 * The reads and writes behind `lib/watch`, and the only file in it that
 * touches the database. Every function takes the Viewer's id as its first
 * argument and never decides who that is: the action reads it from the
 * session, and a page reads it the same way. `answeredWatchLookup` takes the
 * whole answer instead and spells it as a key, which decides no more about
 * who the Viewer is than the others do — and `lib/viewer-key` is pure, so no
 * query drags a session in.
 * — `docs/adr/0005-the-viewer-lives-beside-the-domain.md`
 */

/** The `where` clause that names one piece of Media: `(kind, tmdb_id) = (…)`. */
const whereMedia = (ref: MediaRef) =>
  and(eq(watchRecords.kind, ref.kind), eq(watchRecords.tmdbId, ref.id));

/**
 * The markings one Viewer holds for the Media on one page, in one query. Keyed
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
      score: watchRecords.score,
    })
    .from(watchRecords)
    .where(
      and(eq(watchRecords.viewerId, viewerId), or(...refs.map(whereMedia))),
    );

  return toLookup(rows.map(toMarkedMedia));
};

/**
 * `watchLookup` for a page, which hands it what `answeredViewer()` answered.
 * A database that does not answer is Unanswered rather than an exception:
 * the page hands its cards `null`, they render no control, and the TMDB half
 * of the page renders as if nothing had happened — the two sources fail
 * apart. The cause is logged here because nothing downstream carries it. The
 * action keeps `watchLookup` itself, because it has a message of its own to
 * return.
 *
 * A Visitor asks nothing: no Viewer means no Watch Record, which is an empty
 * lookup — a real absence — and not an Unanswered one. A sign-in that could
 * not be checked asks nothing either, and that is Unanswered: a card that
 * cannot know whose it is has nothing to press. Said here once rather than
 * as a ternary on every page.
 *
 * The key comes back with the markings because this is the one place holding
 * the answer both are read from. A page that pairs them itself is pairing
 * two values it fetched apart, and a mismatched pair is not a type error: it
 * renders one Viewer's markings under another's key, which is the sign-out bug
 * `viewerKey` exists to stop.
 */
export const answeredWatchLookup = async (
  asked: ViewerAnswer,
  refs: readonly MediaRef[],
): Promise<ViewerLookup> => ({
  markings: await answeredMarkings(asked, refs),
  viewerKey: viewerKeyOf(asked),
});

/** The markings half of `answeredWatchLookup`, whose `null` is Unanswered. */
const answeredMarkings = async (
  asked: ViewerAnswer,
  refs: readonly MediaRef[],
): Promise<WatchLookup | null> => {
  if (asked.answer === 'visitor') return toLookup([]);
  if (asked.answer === 'unanswered') return null;

  try {
    return await watchLookup(asked.viewer.id, refs);
  } catch (cause) {
    console.error('Watch Records went Unanswered:', cause);

    return null;
  }
};

/**
 * One page of one Kind of a Viewer's list in one state — the Shows on their
 * Watchlist, the Movies they have watched — newest marking first, with the
 * size of that whole list beside it so the page can count what it is paging
 * through. The Kind narrows here rather than in the page, because a page that
 * fetched both and threw one away would page through a list it was not
 * showing.
 *
 * The state, the Kind and the page arrive as one value, because none of the
 * three names a list without the other two — and because a `where` clause of
 * bare positional arguments is a `where` clause two of them can be swapped
 * in silently.
 *
 * `page` counts from 1, the way the address bar does, and anything else is
 * refused here rather than handed to Postgres as a negative offset: `?page=`
 * is the page's to validate, and this is where forgetting to would surface.
 * The two queries are issued together because neither needs the other.
 */
export const watchRecordsPage = async (
  viewerId: string,
  { state, kind, page }: { state: WatchState; kind: Kind; page: number },
): Promise<WatchRecordsPage> => {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError(`A list page counts from 1, not ${page}`);
  }

  const inList = and(
    eq(watchRecords.viewerId, viewerId),
    eq(watchRecords.state, state),
    eq(watchRecords.kind, kind),
  );

  const [records, [tally]] = await Promise.all([
    db
      .select({
        kind: watchRecords.kind,
        tmdbId: watchRecords.tmdbId,
        state: watchRecords.state,
        score: watchRecords.score,
        updatedAt: watchRecords.updatedAt,
      })
      .from(watchRecords)
      .where(inList)
      .orderBy(desc(watchRecords.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(watchRecords).where(inList),
  ]);

  return {
    // the two columns become one marking here, the way a lookup's rows do,
    // so nothing above the queries holds a state and a Score apart
    records: records.map(({ updatedAt, ...row }) => ({
      ...toMarkedMedia(row),
      updatedAt,
    })),
    total: tally?.total ?? 0,
  };
};

/**
 * How many Watch Records a Viewer holds in each state and Kind, in one
 * grouped query: both numbers a list page shows beside its two Kinds, so the
 * Kind it is not showing admits what waits there — and, for an address that
 * names no Kind, the pair the Kind it shows is chosen from. A pair with no
 * rows is `0` here rather than absent, since a Viewer with no Movies on their
 * Watchlist has none, not a missing count.
 *
 * The four are written out rather than built from `WATCH_STATES` and `KINDS`,
 * so adding either without deciding what its zero is fails to compile.
 */
export const watchTallies = async (viewerId: string): Promise<WatchTallies> => {
  const rows = await db
    .select({
      state: watchRecords.state,
      kind: watchRecords.kind,
      total: count(),
    })
    .from(watchRecords)
    .where(eq(watchRecords.viewerId, viewerId))
    .groupBy(watchRecords.state, watchRecords.kind);

  const tallies: WatchTallies = {
    planned: { tv: 0, movie: 0 },
    watched: { tv: 0, movie: 0 },
  };

  for (const row of rows) tallies[row.state][row.kind] = row.total;

  return tallies;
};

/**
 * Tallies one press of a marking control — records it, and says how many
 * this Viewer has made in the current minute, this one included. A verb
 * because it writes: the row is inserted on the first press, and on
 * conflict the window either restarts — a minute or more has passed, so the
 * tally is 1 again — or carries on with one more. One statement either way.
 * The action compares the answer to `MARKS_PER_MINUTE`.
 *
 * Every press counts, refused ones too, so a client that keeps hammering
 * stays refused until it stops for a minute. The clock is Postgres's, like
 * every other timestamp here.
 */
export const tallyMarking = async (viewerId: string): Promise<number> => {
  // both columns read the row as it was, so the window and the tally restart
  // together or carry on together
  const windowOver = sql`${markingTallies.windowStart} <= now() - interval '1 minute'`;

  const [row] = await db
    .insert(markingTallies)
    .values({ viewerId })
    .onConflictDoUpdate({
      target: markingTallies.viewerId,
      set: {
        tally: sql`case when ${windowOver} then 1 else ${markingTallies.tally} + 1 end`,
        windowStart: sql`case when ${windowOver} then now() else ${markingTallies.windowStart} end`,
      },
    })
    .returning({ tally: markingTallies.tally });

  if (!row) throw new Error('Counting a marking returned no row');

  return row.tally;
};

/**
 * The write half of marking: the Watch Record for a piece of Media, saying
 * what `marking` says, whether or not one existed. One statement: the primary
 * key is the triple, so a second marking is a conflict that becomes the move.
 * `updated_at` is set here by hand, because Drizzle's `$onUpdate` fires for
 * `update` and not for an upsert — and set from Postgres's clock, not this
 * process's, so a move and an insert are ordered by the one clock the lists
 * sort on.
 * — `docs/adr/0007-watchlist-and-watched-are-one-record.md`
 *
 * Both columns are written every time, the Score included, because moving a
 * record to Planned has to clear the Score it used to carry — the check
 * constraint refuses the row otherwise, which is the schema catching what a
 * forgotten `score: null` would have left behind.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 */
export const writeWatchRecord = async (
  viewerId: string,
  ref: MediaRef,
  marking: Marking,
): Promise<void> => {
  const { state } = marking;
  const score = scoreOf(marking);

  await db
    .insert(watchRecords)
    .values({ viewerId, kind: ref.kind, tmdbId: ref.id, state, score })
    .onConflictDoUpdate({
      target: [watchRecords.viewerId, watchRecords.kind, watchRecords.tmdbId],
      set: { state, score, updatedAt: sql`now()` },
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
