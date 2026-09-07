import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

import {
  APPLIED_MIGRATIONS_QUERY,
  type AppliedMigration,
  driftReport,
  hasDrift,
  migrationDrift,
  toApplied,
} from './lib/migration-drift.ts';
import { shippedMigrations } from './lib/migration-files.ts';

/**
 * Says whether the database `DATABASE_URL` names has run the migrations this
 * checkout ships, and exits non-zero when it has not.
 *
 * It exists because production once served `watch_records` and not
 * `marking_tallies`: `0002` and `0003` had never been applied there, so every
 * marking failed on a table that only ever existed in development and in CI.
 * Nothing in the repo could have said so — CI migrates a fresh branch on every
 * run, and no test points anywhere else.
 *
 * Reading only, and never a migration of its own: applying them stays a thing
 * someone does on purpose.
 * — `docs/adr/0009-every-environment-is-a-neon-branch.md`
 *
 * A plain Node script rather than anything of Next's, run by the type
 * stripping Node has had since 22.6 — which is why it imports `.ts` by name
 * and reaches `lib/` by a relative path. `@/` is a bundler's and a test
 * runner's, not Node's.
 */

// the same line `drizzle.config.ts` carries, and for the same reason: this is
// not Next, and nothing here reads `.env.local` on its own
config({ path: '.env.local', quiet: true });

/** The rows of `drizzle.__drizzle_migrations`, or `null` when the table is not
 * there at all — `42P01`, which is an answer and not a failure. */
const appliedMigrations = async (
  sql: ReturnType<typeof neon>,
): Promise<AppliedMigration[] | null> => {
  try {
    const rows = await sql.query(APPLIED_MIGRATIONS_QUERY);

    return toApplied(rows as { hash: string; created_at: string }[]);
  } catch (cause) {
    if (
      cause !== null &&
      typeof cause === 'object' &&
      'code' in cause &&
      cause.code === '42P01'
    ) {
      return null;
    }

    throw cause;
  }
};

const url = process.env.DATABASE_URL;

if (!url) throw new Error('Missing DATABASE_URL');

const drift = migrationDrift(
  shippedMigrations(),
  await appliedMigrations(neon(url)),
);

console.log(driftReport(drift));

if (hasDrift(drift)) process.exit(1);
