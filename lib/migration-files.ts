import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { ShippedMigration } from './migration-drift.ts';

/**
 * The filesystem half of `pnpm db:check`: what `drizzle/` ships, read the way
 * drizzle-kit reads it. Apart from `lib/migration-drift.ts` so that the
 * comparison stays a pure unit test, and apart from `db-check.ts` so the
 * integration project can read the same side without running the script.
 *
 * Node runs the script, so this file is in its graph too: it reaches its
 * neighbour by relative path with the extension, the way `db-check.ts`
 * reaches this one. `@/` would resolve everywhere but there.
 */

/** Where the migrations and their journal live, as `drizzle.config.ts` puts
 * them. */
export const MIGRATIONS_FOLDER = 'drizzle';

type JournalEntry = { tag: string; when: number };

/**
 * The migrations this checkout ships, hashed the way drizzle-kit hashes them
 * — sha256 of the file's whole text — so an edited one compares like with
 * like. `readMigrationFiles` in `drizzle-orm/migrator` computes the same hash
 * and drops the tag, and the tag is the only part worth printing, so the
 * journal is read here instead.
 */
export const shippedMigrations = (
  folder: string = MIGRATIONS_FOLDER,
): ShippedMigration[] => {
  const journal = JSON.parse(
    readFileSync(`${folder}/meta/_journal.json`, 'utf8'),
  ) as { entries: JournalEntry[] };

  return journal.entries.map(({ tag, when }) => ({
    tag,
    when,
    hash: crypto
      .createHash('sha256')
      .update(readFileSync(`${folder}/${tag}.sql`, 'utf8'))
      .digest('hex'),
  }));
};
