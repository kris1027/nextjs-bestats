import {
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import type { Kind } from '@/lib/media';

/**
 * A Watch Record's two Kinds. `import type` above is erased, so listing them
 * here does not drag `lib/media` into drizzle-kit at generate time, while
 * `satisfies` still fails the build if either word stops being a Kind.
 */
export const mediaKind = pgEnum('media_kind', [
  'tv',
  'movie',
] as const satisfies readonly Kind[]);

/** Planned or Watched, and never a third thing. */
export const watchState = pgEnum('watch_state', ['planned', 'watched']);

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
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // the moment of the last marking, which is what the lists order by
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.viewerId, table.kind, table.tmdbId] }),
    // exactly the query `/watchlist` and `/watched` each make
    index('watch_records_viewer_state_idx').on(
      table.viewerId,
      table.state,
      table.updatedAt.desc(),
    ),
  ],
);
