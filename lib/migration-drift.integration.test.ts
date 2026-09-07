import { sql } from 'drizzle-orm';
import { expect, test } from 'vitest';

import { db } from '@/lib/db';
import {
  APPLIED_MIGRATIONS_QUERY,
  driftReport,
  hasDrift,
  migrationDrift,
  toApplied,
} from '@/lib/migration-drift';
import { shippedMigrations } from '@/lib/migration-files';

/**
 * `pnpm db:check` against whatever branch `DATABASE_URL` names, which for
 * this project is the branch the rest of the integration suite runs on. Green
 * in CI by construction — the workflow migrates a fresh branch before it runs
 * — so what this covers is the reading rather than the comparison: that the
 * query names a table that exists, that `created_at` survives being a
 * `bigint`, and that the hashes computed from `drizzle/` are the hashes
 * drizzle-kit wrote.
 *
 * The rest of the suite depends on this being true, so a failure here is why
 * the others failed.
 */

const applied = async () => {
  const { rows } = await db.execute<{ hash: string; created_at: string }>(
    sql.raw(APPLIED_MIGRATIONS_QUERY),
  );

  return toApplied(rows);
};

test('the connected branch has run every migration this checkout ships', async () => {
  const drift = migrationDrift(shippedMigrations(), await applied());

  // the report rather than the booleans, so a failure says which migration
  expect(driftReport(drift)).toBe(
    'Every migration this build ships has been applied.',
  );
  expect(hasDrift(drift)).toBe(false);
});

test('the hashes in the migrations table are the ones drizzle-kit wrote', async () => {
  const rows = await applied();
  const shipped = shippedMigrations();

  // `edited` is the only finding that depends on hashing the files the same
  // way drizzle-kit does, and a wrong hash would be silent everywhere else
  expect(rows.map((row) => row.hash)).toEqual(
    shipped.map((migration) => migration.hash),
  );
});
