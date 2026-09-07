import { expect, test } from 'vitest';

import {
  type AppliedMigration,
  driftReport,
  hasDrift,
  migrationDrift,
  type ShippedMigration,
  toApplied,
} from '@/lib/migration-drift';

/**
 * The comparison behind `pnpm db:check`. Fixtures rather than a database,
 * since what is worth testing is which of four disagreements a pair of sides
 * is in — the reading of them is `db-check.ts`'s, and the integration project
 * checks that against a real branch.
 */

/** A shipped migration whose hash is derived from its tag, so a test says
 * "the file changed" by passing a different one rather than by typing sha256s. */
const shipped = (
  tag: string,
  when: number,
  hash = `hash-${tag}`,
): ShippedMigration => ({
  tag,
  when,
  hash,
});

/** What the same migration looks like once drizzle-kit has recorded it. */
const applied = (migration: ShippedMigration): AppliedMigration => ({
  hash: migration.hash,
  createdAt: migration.when,
});

const ZERO = shipped('0000_watch_records', 1000);
const ONE = shipped('0001_viewer_foreign_key', 2000);
const TWO = shipped('0002_marking_tallies', 3000);
const THREE = shipped('0003_marking_tallies_viewer_foreign_key', 4000);

test('a database holding every shipped migration has no drift', () => {
  const drift = migrationDrift([ZERO, ONE, TWO], [ZERO, ONE, TWO].map(applied));

  expect(drift).toEqual({
    migrated: true,
    missing: [],
    unreachable: [],
    edited: [],
    ahead: [],
  });
  expect(hasDrift(drift)).toBe(false);
});

test('the outage this exists for: the two production never ran', () => {
  const drift = migrationDrift(
    [ZERO, ONE, TWO, THREE],
    [ZERO, ONE].map(applied),
  );

  expect(drift.missing).toEqual([TWO, THREE]);
  expect(drift.unreachable).toEqual([]);
  expect(drift.edited).toEqual([]);
  expect(hasDrift(drift)).toBe(true);
  expect(driftReport(drift)).toContain('0002_marking_tallies');
  expect(driftReport(drift)).toContain(
    '0003_marking_tallies_viewer_foreign_key',
  );
});

test('no migrations table is its own answer, not every migration missing', () => {
  const drift = migrationDrift([ZERO, ONE], null);

  expect(drift.migrated).toBe(false);
  expect(drift.missing).toEqual([ZERO, ONE]);
  expect(hasDrift(drift)).toBe(true);
  expect(driftReport(drift)).toContain('never been migrated');
});

test('an empty table runs everything: nothing is unreachable behind nothing', () => {
  const drift = migrationDrift([ZERO, ONE], []);

  expect(drift.migrated).toBe(true);
  expect(drift.missing).toEqual([ZERO, ONE]);
  expect(drift.unreachable).toEqual([]);
});

test('a migration timestamped below the newest applied one is unreachable', () => {
  // what a hand-written `--custom` migration can produce: written after
  // `0002` ran, numbered after it, but stamped before it
  const stranded = shipped('0003_a_hand_written_one', 2500);
  const drift = migrationDrift(
    [ZERO, ONE, TWO, stranded],
    [ZERO, ONE, TWO].map(applied),
  );

  expect(drift.missing).toEqual([]);
  expect(drift.unreachable).toEqual([stranded]);
  expect(hasDrift(drift)).toBe(true);
  expect(driftReport(drift)).toContain('skip these on every run');
});

test('a migration sharing the newest timestamp is unreachable too', () => {
  // `migrate()` compares strictly greater, so a tie never runs
  const tied = shipped('0003_tied', TWO.when);
  const drift = migrationDrift(
    [ZERO, ONE, TWO, tied],
    [ZERO, ONE, TWO].map(applied),
  );

  expect(drift.unreachable).toEqual([tied]);
});

test('a file edited after it was applied is neither missing nor re-run', () => {
  const rewritten = shipped(ONE.tag, ONE.when, 'hash-after-the-edit');
  const drift = migrationDrift(
    [ZERO, rewritten, TWO],
    [ZERO, ONE, TWO].map(applied),
  );

  expect(drift.missing).toEqual([]);
  expect(drift.edited).toEqual([rewritten]);
  expect(hasDrift(drift)).toBe(true);
  expect(driftReport(drift)).toContain('applied, then edited');
});

test('a database ahead of the build is a note, not a failure', () => {
  const drift = migrationDrift([ZERO, ONE], [ZERO, ONE, TWO].map(applied));

  expect(drift.missing).toEqual([]);
  expect(drift.ahead).toEqual([applied(TWO)]);
  expect(hasDrift(drift)).toBe(false);
  expect(driftReport(drift)).toContain('this build does not ship');
});

test('toApplied widens the bigint every driver hands back as a string', () => {
  expect(toApplied([{ hash: 'h', created_at: '1788706576205' }])).toEqual([
    { hash: 'h', createdAt: 1788706576205 },
  ]);
});
