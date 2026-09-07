/**
 * Whether a database has run the migrations a build ships, and nothing that
 * reads a file or opens a connection. `db-check.ts` supplies both sides and
 * prints what comes back; the integration project supplies the same two sides
 * from a real Neon branch. Pure here so the interesting half — which of four
 * disagreements a database is in — is a unit test rather than a fixture
 * database.
 * — `docs/adr/0009-every-environment-is-a-neon-branch.md`
 */

/** One migration as the build ships it: `drizzle/meta/_journal.json` and the
 * sha256 of the `.sql` file beside it, which is what drizzle-kit records. */
export type ShippedMigration = {
  /** `0002_marking_tallies`, the journal's word and the filename's. */
  tag: string;
  /** The journal's `when`, which drizzle-kit writes as `created_at`. */
  when: number;
  hash: string;
};

/** One row of `drizzle.__drizzle_migrations`, which holds no tag — only the
 * hash and the timestamp the journal entry it came from carried. */
export type AppliedMigration = {
  hash: string;
  createdAt: number;
};

/** The query behind `applied`, written once so the script and the integration
 * test ask the same question of the same table. */
export const APPLIED_MIGRATIONS_QUERY =
  'select hash, created_at from drizzle.__drizzle_migrations order by created_at';

/**
 * The four ways a database and a build can disagree, and the one way they
 * agree. Kept apart rather than collapsed into a count because they need
 * different answers: `missing` is fixed by running `db:migrate`, and the
 * other three are not.
 */
export type MigrationDrift = {
  /** `false` when there is no `drizzle.__drizzle_migrations` at all: nothing
   * has ever been migrated here, which usually means the wrong database. */
  migrated: boolean;
  /** Shipped, not applied, and `db:migrate` would run them. */
  missing: ShippedMigration[];
  /**
   * Shipped, not applied, and `db:migrate` never will. `migrate()` compares
   * each migration against the newest `created_at` alone, so one timestamped
   * below that is skipped on every run — silently, with an exit code of 0.
   */
  unreachable: ShippedMigration[];
  /** Applied, but the `.sql` file has changed since. Nothing re-runs it, so
   * the database and the repo disagree permanently. */
  edited: ShippedMigration[];
  /** Applied here and not shipped by this build — an older checkout, or a
   * rollback. The app still runs, so this warns rather than fails. */
  ahead: AppliedMigration[];
};

/**
 * Reads what a driver hands back for `APPLIED_MIGRATIONS_QUERY`. `created_at`
 * is a `bigint`, which every Postgres driver returns as a string rather than
 * lose precision, so it is widened here once instead of at both call sites.
 */
export const toApplied = (
  rows: readonly { hash: string; created_at: string | number }[],
): AppliedMigration[] =>
  rows.map((row) => ({ hash: row.hash, createdAt: Number(row.created_at) }));

/**
 * What `applied` has still to run of `shipped`, and what the two disagree
 * about. `applied` is `null` when the migrations table itself is absent.
 *
 * The two sides are matched on the timestamp rather than the hash, because
 * that is the column drizzle-kit matches on and a row carries no tag. Matching
 * on the hash instead would read an edited migration as a missing one and tell
 * you to run something that has already run.
 */
export const migrationDrift = (
  shipped: readonly ShippedMigration[],
  applied: readonly AppliedMigration[] | null,
): MigrationDrift => {
  if (!applied) {
    return {
      migrated: false,
      missing: [...shipped],
      unreachable: [],
      edited: [],
      ahead: [],
    };
  }

  // one applied row answers for one migration: two shipped migrations may
  // share a timestamp, and the second of them is no more applied than a
  // missing one, so each row is claimed rather than looked up twice
  const unclaimed = new Map<number, AppliedMigration[]>();

  for (const row of applied) {
    const rows = unclaimed.get(row.createdAt);

    if (rows) rows.push(row);
    else unclaimed.set(row.createdAt, [row]);
  }

  // what `migrate()` compares against: below it nothing runs, and an empty
  // table has no newest row, so everything is still ahead of it
  const newest = applied.reduce(
    (high, row) => Math.max(high, row.createdAt),
    Number.NEGATIVE_INFINITY,
  );

  const missing: ShippedMigration[] = [];
  const unreachable: ShippedMigration[] = [];
  const edited: ShippedMigration[] = [];

  for (const migration of shipped) {
    const row = unclaimed.get(migration.when)?.shift();

    if (!row) {
      // strictly greater, the way `migrate()` reads it: a migration sharing
      // the newest timestamp is skipped too
      if (migration.when > newest) missing.push(migration);
      else unreachable.push(migration);

      continue;
    }

    if (row.hash !== migration.hash) edited.push(migration);
  }

  return {
    migrated: true,
    missing,
    unreachable,
    edited,
    // whatever no shipped migration claimed
    ahead: [...unclaimed.values()].flat(),
  };
};

/** Whether the check should fail. Being ahead of the build is not drift: the
 * database has everything this build needs and more. */
export const hasDrift = (drift: MigrationDrift): boolean =>
  !drift.migrated ||
  drift.missing.length > 0 ||
  drift.unreachable.length > 0 ||
  drift.edited.length > 0;

const list = (migrations: readonly ShippedMigration[]): string =>
  migrations.map((migration) => `  ${migration.tag}`).join('\n');

/**
 * What the script prints. A string rather than a series of `console.log`
 * calls so the wording is a unit test's to assert, and so the caller decides
 * where it goes.
 */
export const driftReport = (drift: MigrationDrift): string => {
  const lines: string[] = [];

  if (!drift.migrated) {
    lines.push(
      'drizzle.__drizzle_migrations does not exist: this database has never been migrated.',
      'Check which branch DATABASE_URL names before running db:migrate.',
    );
  } else if (drift.missing.length > 0) {
    lines.push(
      `${drift.missing.length} shipped but not applied — run db:migrate:`,
      list(drift.missing),
    );
  }

  if (drift.unreachable.length > 0) {
    lines.push(
      `${drift.unreachable.length} shipped but timestamped below one already applied.`,
      'db:migrate will skip these on every run and still exit 0:',
      list(drift.unreachable),
    );
  }

  if (drift.edited.length > 0) {
    lines.push(
      `${drift.edited.length} applied, then edited. Nothing re-runs a migration:`,
      list(drift.edited),
    );
  }

  if (drift.ahead.length > 0) {
    lines.push(
      `Note: ${drift.ahead.length} applied here that this build does not ship.`,
    );
  }

  if (lines.length === 0)
    lines.push('Every migration this build ships has been applied.');

  return lines.join('\n');
};
