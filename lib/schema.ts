import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { Kind } from '@/lib/media';
import type { WatchState } from '@/lib/watch';

/**
 * A Watch Record's two Kinds. `import type` above is erased, so listing them
 * here does not drag `lib/media` into drizzle-kit at generate time, while
 * `satisfies` still fails the build if either word stops being a Kind.
 */
export const mediaKind = pgEnum('media_kind', [
  'tv',
  'movie',
] as const satisfies readonly Kind[]);

/**
 * Planned or Watched, and never a third thing. The same trick as `mediaKind`:
 * the list is `lib/watch`'s, and this enum has to keep satisfying it.
 */
export const watchState = pgEnum('watch_state', [
  'planned',
  'watched',
] as const satisfies readonly WatchState[]);

/**
 * One Viewer's recorded relationship to one piece of Media.
 *
 * The primary key is the triple itself, so the invariant is the schema's to
 * keep rather than the writer's: a Viewer cannot hold two records for one
 * piece of Media, and a record cannot be in both states at once. It is
 * composite because a TMDB id is unique only within a Kind — `tv/1399` and
 * `movie/1399` are different Media.
 * — `docs/adr/0007-watchlist-and-watched-are-one-record.md`
 *
 * A Watched row carries a Score and a Planned row carries none, which the
 * check constraint below keeps rather than the code that writes it: giving a
 * Score is what makes a record Watched, so the two columns have two legal
 * pairs out of the four they can spell. Only a Movie's row is Watched, which
 * a second constraint keeps: a Show is never Watched, its Episodes are.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 *
 * Nothing from TMDB is stored: no label, no poster path, no snapshot.
 * — `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
 */
export const watchRecords = pgTable(
  'watch_records',
  {
    // a `uuid` because that is what `neon_auth.user.id` is. The foreign key
    // to it is declared in a migration of its own rather than here: Neon Auth
    // owns that table, and a Drizzle `references()` makes drizzle-kit try to
    // create it.
    viewerId: uuid('viewer_id').notNull(),
    kind: mediaKind('kind').notNull(),
    tmdbId: integer('tmdb_id').notNull(),
    state: watchState('state').notNull(),
    // the Viewer's own one to ten, and `null` on a Planned row. A `smallint`
    // because ten is the largest it will ever hold; the range is the check
    // constraint's to enforce, since no integer type is 1..10.
    score: smallint('score'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // the moment of the last marking, which is what the lists order by — from
    // Postgres's clock, like the default and the upsert, so no two rows are
    // ever ordered across two clocks
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.viewerId, table.kind, table.tmdbId] }),
    // the prefix of the Watched list's page and tallies, which narrow to one
    // Kind on top of it: the index does not carry `kind`, so Postgres walks
    // these rows in `updated_at` order and drops the other Kind. Adding it
    // would make it exact and cost a migration; one Viewer's list is small
    // enough that it has not been worth one. The Watchlist no longer pages
    // here — it reads everything tracked, on `viewer_id` alone
    // — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
    index('watch_records_viewer_state_idx').on(
      table.viewerId,
      table.state,
      table.updatedAt.desc(),
    ),
    // the two pairs the domain has, out of the four these columns can spell.
    // Written as SQL rather than as a rule the writers remember, so a Watched
    // row without a Score is a rejected statement and never a row a reader
    // has to interpret.
    //
    // `is not null` before the range, and not for tidiness: a check constraint
    // passes on NULL as well as on true, and `null between 1 and 10` is NULL,
    // so without it the one row this constraint exists to forbid — Watched,
    // no Score — is the one row it would have let through.
    check(
      'watch_records_score_matches_state',
      sql`(${table.state} = 'planned' and ${table.score} is null)
       or (${table.state} = 'watched' and ${table.score} is not null
           and ${table.score} between 1 and 10)`,
    ),
    // a Show is followed through its Episodes and never Watched itself, so a
    // Watched row is a Movie's. Its own constraint rather than a clause in the
    // one above, which says what a state carries and not what it is about.
    // Neither column is nullable, so this one has no NULL to fall through.
    // — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
    check(
      'watch_records_watched_is_a_movie',
      sql`${table.state} <> 'watched' or ${table.kind} = 'movie'`,
    ),
  ],
);

/**
 * One Viewer's Watch Record for one Episode, which is only ever Watched at a
 * Score: there is no Planned Episode, so there is no state column, and the
 * Score is `not null` rather than checked against one.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 *
 * Keyed on TMDB's id for the Episode and not on its season and number, which
 * TMDB renumbers: a Score keyed on a position would stay behind when the
 * Episode moved. The Show's id rides beside it as the app's own relationship,
 * so a Show's records can be found without asking TMDB; nothing else from
 * TMDB is kept.
 * — `docs/adr/0020-an-episode-record-is-keyed-on-its-tmdb-id.md`
 *
 * A table of its own rather than rows in `watch_records`, since that would
 * have made an Episode a Kind, and a Kind is a Show or a Movie.
 */
export const episodeRecords = pgTable(
  'episode_records',
  {
    // a `uuid` for the reason `watch_records.viewer_id` is one, and its
    // foreign key a migration of its own for the same reason
    viewerId: uuid('viewer_id').notNull(),
    episodeId: integer('episode_id').notNull(),
    showId: integer('show_id').notNull(),
    score: smallint('score').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => sql`now()`)
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.viewerId, table.episodeId] }),
    // how a Show's page and the lists will ask for one Viewer's Episodes of
    // one Show
    index('episode_records_viewer_show_idx').on(table.viewerId, table.showId),
    check(
      'episode_records_score_in_range',
      sql`${table.score} between 1 and 10`,
    ),
  ],
);

/**
 * How often one Viewer has marked lately: one row per Viewer, holding the
 * minute it started counting and how many presses it has seen since. The
 * marking action refuses a press once the tally passes `MARKS_PER_MINUTE`,
 * and the row is rewritten rather than accumulated, so a Viewer never owns
 * more than one. It guards Neon's compute against a runaway client, not a
 * Viewer against themselves.
 *
 * Like `watch_records`, the foreign key to the Viewer is a migration of its
 * own: Neon owns `neon_auth.user`, and drizzle-kit cannot see it.
 */
export const markingTallies = pgTable('marking_tallies', {
  viewerId: uuid('viewer_id').primaryKey(),
  windowStart: timestamp('window_start').defaultNow().notNull(),
  tally: integer('tally').default(1).notNull(),
});
