import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';

import { MIGRATIONS_FOLDER, shippedMigrations } from '@/lib/migration-files';

/**
 * The filesystem half of `pnpm db:check`. Fixtures written to a temporary
 * folder, since what is worth testing is what `shippedMigrations` makes of a
 * `drizzle/` directory rather than what this repo's happens to hold — and the
 * one thing that has to be true of the real one is checked against it at the
 * end.
 *
 * The hashes are not asserted against typed-in sha256s. That would restate
 * the implementation; the integration project compares them against the ones
 * drizzle-kit itself wrote, which is the comparison that matters.
 */

/** A `drizzle/` folder holding exactly the migrations it is given, journal
 * included, in the shape drizzle-kit writes. */
const folderHolding = (
  migrations: readonly { tag: string; when: number; sql: string }[],
): string => {
  const folder = mkdtempSync(join(tmpdir(), 'bestats-migrations-'));

  mkdirSync(join(folder, 'meta'));
  writeFileSync(
    join(folder, 'meta', '_journal.json'),
    JSON.stringify({
      entries: migrations.map(({ tag, when }) => ({ tag, when })),
    }),
  );

  for (const { tag, sql } of migrations)
    writeFileSync(join(folder, `${tag}.sql`), sql);

  return folder;
};

test('a migration is its journal entry and the hash of the file beside it', () => {
  const folder = folderHolding([
    { tag: '0000_watch_records', when: 1000, sql: 'create table watch;' },
    { tag: '0001_viewer_foreign_key', when: 2000, sql: 'alter table watch;' },
  ]);

  const shipped = shippedMigrations(folder);

  expect(shipped.map(({ tag, when }) => ({ tag, when }))).toEqual([
    { tag: '0000_watch_records', when: 1000 },
    { tag: '0001_viewer_foreign_key', when: 2000 },
  ]);
  // sha256, which is what drizzle-kit records and what `edited` compares
  for (const migration of shipped)
    expect(migration.hash).toMatch(/^[0-9a-f]{64}$/);
});

test('the journal decides the order, not the directory listing', () => {
  const folder = folderHolding([
    { tag: '0001_second', when: 2000, sql: 'select 2;' },
    { tag: '0000_first', when: 1000, sql: 'select 1;' },
  ]);

  expect(shippedMigrations(folder).map((migration) => migration.tag)).toEqual([
    '0001_second',
    '0000_first',
  ]);
});

test('an edited file hashes differently and identical files hash alike', () => {
  const before = shippedMigrations(
    folderHolding([{ tag: '0000_a', when: 1000, sql: 'select 1;' }]),
  );
  const after = shippedMigrations(
    folderHolding([{ tag: '0000_a', when: 1000, sql: 'select 1; -- fixed' }]),
  );
  const again = shippedMigrations(
    folderHolding([{ tag: '0000_a', when: 1000, sql: 'select 1;' }]),
  );

  // `edited` is this difference and nothing else
  expect(after[0]?.hash).not.toBe(before[0]?.hash);
  expect(again[0]?.hash).toBe(before[0]?.hash);
});

test('a journal naming a file that is not there fails rather than skips it', () => {
  const folder = folderHolding([
    { tag: '0000_present', when: 1000, sql: 'select 1;' },
  ]);

  writeFileSync(
    join(folder, 'meta', '_journal.json'),
    JSON.stringify({
      entries: [
        { tag: '0000_present', when: 1000 },
        { tag: '0001_absent', when: 2000 },
      ],
    }),
  );

  // silence here would report a migration as unshipped, and `db:check` would
  // call an unmigrated database up to date
  expect(() => shippedMigrations(folder)).toThrow();
});

test('the default folder is this checkout, and it has migrations in it', () => {
  expect(MIGRATIONS_FOLDER).toBe('drizzle');
  expect(shippedMigrations().length).toBeGreaterThan(0);
});
