import { and, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';

import type { ViewerAnswer } from '@/lib/auth';
import { db } from '@/lib/db';
import type { Kind, MediaRef } from '@/lib/media';
import { episodeRecords, markingTallies, watchRecords } from '@/lib/schema';
import { viewerKeyOf } from '@/lib/viewer-key';
import {
  assertListPage,
  type EpisodeLookup,
  type EpisodeMarking,
  isScore,
  type Marking,
  PAGE_SIZE,
  type RecordedEpisode,
  scoreOf,
  TRACKED_CEILING,
  type TrackedMedia,
  toLookup,
  toMarkedMedia,
  type ViewerEpisodeLookup,
  type ViewerLookup,
  type WatchLookup,
  type WatchRecordsPage,
  watchedAt,
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
const answeredMarkings = (
  asked: ViewerAnswer,
  refs: readonly MediaRef[],
): Promise<WatchLookup | null> =>
  answeredFor(asked, toLookup([]), (viewerId) => watchLookup(viewerId, refs));

/**
 * What a lookup is for the answer a page was handed: `none` for a Visitor,
 * who holds no Watch Records, `null` — Unanswered — for a sign-in that could
 * not be checked or a database that did not answer, and otherwise whatever
 * `read` found. The rule both kinds of lookup follow, said once.
 */
const answeredFor = async <T>(
  asked: ViewerAnswer,
  none: T,
  read: (viewerId: string) => Promise<T>,
): Promise<T | null> => {
  if (asked.answer === 'visitor') return none;
  if (asked.answer === 'unanswered') return null;

  try {
    return await read(asked.viewer.id);
  } catch (cause) {
    console.error('Watch Records went Unanswered:', cause);

    return null;
  }
};

/**
 * The Scores one Viewer has given the Episodes a page draws, in one query,
 * keyed by TMDB's id for each Episode.
 */
export const episodeLookup = async (
  viewerId: string,
  episodeIds: readonly number[],
): Promise<EpisodeLookup> => {
  if (episodeIds.length === 0) return new Map();

  const rows = await db
    .select({
      episodeId: episodeRecords.episodeId,
      score: episodeRecords.score,
    })
    .from(episodeRecords)
    .where(
      and(
        eq(episodeRecords.viewerId, viewerId),
        inArray(episodeRecords.episodeId, [...episodeIds]),
      ),
    );

  return new Map(
    rows.map((row) => [row.episodeId, toEpisodeMarking(row.score)]),
  );
};

/**
 * A row's Score as a marking. Throws on a Score the check constraint forbids,
 * for the reason `toMarking` does: such a row cannot exist.
 */
const toEpisodeMarking = (score: number): EpisodeMarking => {
  if (isScore(score)) return watchedAt(score);

  throw new Error(`An Episode record with no Score in range: ${score}`);
};

/**
 * `episodeLookup` for a page, which hands it what `answeredViewer()`
 * answered: `answeredWatchLookup` for Episodes, and with its key beside it
 * for the same reason.
 */
export const answeredEpisodeLookup = async (
  asked: ViewerAnswer,
  episodeIds: readonly number[],
): Promise<ViewerEpisodeLookup> => ({
  markings: await answeredFor<EpisodeLookup>(asked, new Map(), (viewerId) =>
    episodeLookup(viewerId, episodeIds),
  ),
  viewerKey: viewerKeyOf(asked),
});

/**
 * Every Score one Viewer has given the Episodes of one Show, keyed by TMDB's
 * id for each Episode, latest scored first. Found by the Show's id without
 * asking TMDB, which is what lets a Show's page find the records TMDB no
 * longer lists an Episode for.
 * — `docs/adr/0020-an-episode-record-is-keyed-on-its-tmdb-id.md`
 */
export const showEpisodeLookup = async (
  viewerId: string,
  showId: number,
): Promise<EpisodeLookup> => {
  const rows = await db
    .select({
      episodeId: episodeRecords.episodeId,
      score: episodeRecords.score,
    })
    .from(episodeRecords)
    .where(
      and(
        eq(episodeRecords.viewerId, viewerId),
        eq(episodeRecords.showId, showId),
      ),
    )
    .orderBy(desc(episodeRecords.updatedAt), episodeRecords.episodeId);

  // a Map keeps the order it was built in, which is the query's
  return new Map(
    rows.map((row) => [row.episodeId, toEpisodeMarking(row.score)]),
  );
};

/**
 * `showEpisodeLookup` for a page, answered the way `answeredEpisodeLookup`
 * is and with its key beside it for the same reason.
 */
export const answeredShowEpisodeLookup = async (
  asked: ViewerAnswer,
  showId: number,
): Promise<ViewerEpisodeLookup> => ({
  markings: await answeredFor<EpisodeLookup>(asked, new Map(), (viewerId) =>
    showEpisodeLookup(viewerId, showId),
  ),
  viewerKey: viewerKeyOf(asked),
});

/**
 * One page of the Movies a Viewer has watched, newest marking first, with how
 * many there are in all beside it so the page can count what it is paging
 * through. The one list tab left that Postgres pages: only a Movie's record is
 * Watched, and every other tab is placed from TMDB's answers, so the state and
 * the Kind are this query's and not a caller's to pass.
 * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
 *
 * `page` counts from 1, and anything else is refused before Postgres sees it,
 * by `assertListPage`. The two queries are issued together because neither
 * needs the other.
 */
export const watchedMoviesPage = async (
  viewerId: string,
  page: number,
): Promise<WatchRecordsPage> => {
  assertListPage(page);

  const inList = and(
    eq(watchRecords.viewerId, viewerId),
    eq(watchRecords.state, 'watched'),
    eq(watchRecords.kind, 'movie'),
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
 * Every Movie and Show a Viewer is tracking: each Planned record, and each
 * Show with an Episode scored, whether or not it has a record of its own.
 * `markedAt` is the latest marking on the Movie, the Show or any of its
 * Episodes, which is what the Watchlist orders by, and a Show brings the ids
 * of its scored Episodes for `upNext`.
 * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
 */
export const trackedMedia = async (
  viewerId: string,
): Promise<TrackedMedia[]> => {
  // every marking that can make Media tracked, one row each: a Show's own
  // record of any state, since a Show under way still orders by it, and each
  // Episode as a marking on its Show
  const markings = unionAll(
    db
      .select({
        kind: watchRecords.kind,
        tmdbId: watchRecords.tmdbId,
        markedAt: watchRecords.updatedAt,
        planned: sql<boolean>`${watchRecords.state} = 'planned'`.as('planned'),
        episodeId: sql<number | null>`null::integer`.as('episode_id'),
      })
      .from(watchRecords)
      .where(
        and(
          eq(watchRecords.viewerId, viewerId),
          or(eq(watchRecords.state, 'planned'), eq(watchRecords.kind, 'tv')),
        ),
      ),
    db
      .select({
        kind: sql<Kind>`'tv'::media_kind`.as('kind'),
        tmdbId: episodeRecords.showId,
        markedAt: episodeRecords.updatedAt,
        planned: sql<boolean>`false`.as('planned'),
        episodeId: episodeRecords.episodeId,
      })
      .from(episodeRecords)
      .where(eq(episodeRecords.viewerId, viewerId)),
  ).as('markings');

  const rows = await db
    .select({
      kind: markings.kind,
      tmdbId: markings.tmdbId,
      markedAt: sql<Date>`max(${markings.markedAt})`.mapWith(
        watchRecords.updatedAt,
      ),
      // each Episode's id and the moment it was scored, as epoch milliseconds:
      // JSON because the driver parses it, where it hands a timestamp array
      // over as the text of one
      scored: sql<
        Record<string, number>
      >`coalesce(json_object_agg(${markings.episodeId}, extract(epoch from ${markings.markedAt}) * 1000) filter (where ${markings.episodeId} is not null), '{}'::json)`,
    })
    .from(markings)
    .groupBy(markings.kind, markings.tmdbId)
    .having(
      sql`bool_or(${markings.planned}) or count(${markings.episodeId}) > 0`,
    )
    // the ceiling here too, so what is read is bounded and not only what is
    // placed; one past it, so `withinCeiling` can tell a list cut short from
    // one that holds exactly 200, and keeps the same 200 of what it is handed
    .orderBy(sql`max(${markings.markedAt}) desc`)
    .limit(TRACKED_CEILING + 1);

  return rows.map(({ kind, tmdbId, markedAt, scored }) => ({
    ref: { kind, id: tmdbId },
    markedAt,
    scored: new Map(
      Object.entries(scored).map(([episodeId, at]) => [
        Number(episodeId),
        new Date(Number(at)),
      ]),
    ),
  }));
};

/**
 * How many Movies a Viewer has watched: the number the Watched list's Movies
 * tab wears. Only a Movie's record is Watched, so this is the only tally left
 * that Postgres can answer; the Shows tab counts finished Shows, which only
 * TMDB can say, and is counted from what is placed, by `placedTallies`.
 * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
 */
export const watchedMovieCount = async (viewerId: string): Promise<number> => {
  const [tally] = await db
    .select({ total: count() })
    .from(watchRecords)
    .where(
      and(
        eq(watchRecords.viewerId, viewerId),
        eq(watchRecords.state, 'watched'),
        eq(watchRecords.kind, 'movie'),
      ),
    );

  return tally?.total ?? 0;
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

/**
 * The write half of scoring an Episode: its Watch Record at `marking`'s
 * Score, whether or not one existed, with `updated_at` set by hand for the
 * reason `writeWatchRecord` gives. The Show's id is written on the insert
 * only: an Episode does not change Shows.
 *
 * The Show's Planned record goes in the same batch, since Planned lasts only
 * until the first Episode. One batch because the HTTP driver has no
 * interactive transactions, and a Score written without the delete would
 * leave the Show Planned and under way at once.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 */
export const writeEpisodeRecord = async (
  viewerId: string,
  episode: RecordedEpisode,
  marking: EpisodeMarking,
): Promise<void> => {
  await db.batch([
    db
      .insert(episodeRecords)
      .values({ viewerId, ...episode, score: marking.score })
      .onConflictDoUpdate({
        target: [episodeRecords.viewerId, episodeRecords.episodeId],
        set: { score: marking.score, updatedAt: sql`now()` },
      }),
    db
      .delete(watchRecords)
      .where(
        and(
          eq(watchRecords.viewerId, viewerId),
          whereMedia({ kind: 'tv', id: episode.showId }),
          eq(watchRecords.state, 'planned'),
        ),
      ),
  ]);
};

/**
 * `writeWatchRecord` for a Planned Show, refused while the Viewer is under way
 * with it: `false`, and nothing written, once any of its Episodes is scored.
 * The check and the write are one statement, because the HTTP driver has no
 * interactive transactions and an Episode scored between a read and a write
 * would leave the Show Planned and under way at once.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 *
 * SQL rather than the builder, since an `insert … select` with no table to
 * select from is not something Drizzle can spell. The casts are there because
 * a parameter in a select list reaches Postgres as text.
 */
export const writePlannedShow = async (
  viewerId: string,
  showId: number,
): Promise<boolean> => {
  const { rows } = await db.execute(sql`
    insert into ${watchRecords} (viewer_id, kind, tmdb_id, state, score)
    select ${viewerId}::uuid, 'tv'::media_kind, ${showId}::integer,
      'planned'::watch_state, null
    where not exists (
      select 1 from ${episodeRecords}
      where ${episodeRecords.viewerId} = ${viewerId}::uuid
        and ${episodeRecords.showId} = ${showId}::integer
    )
    on conflict (viewer_id, kind, tmdb_id)
    do update set state = excluded.state, score = excluded.score,
      updated_at = now()
    returning 1
  `);

  return rows.length > 0;
};

/** Unscores an Episode: the row goes, since an Episode has no other state. */
export const clearEpisodeRecord = async (
  viewerId: string,
  episodeId: number,
): Promise<void> => {
  await db
    .delete(episodeRecords)
    .where(
      and(
        eq(episodeRecords.viewerId, viewerId),
        eq(episodeRecords.episodeId, episodeId),
      ),
    );
};
