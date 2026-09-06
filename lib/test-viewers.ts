import { sql } from 'drizzle-orm';
import { afterAll } from 'vitest';

import { db } from '@/lib/db';

/**
 * Viewers for the integration project. They live in `neon_auth`, which Neon
 * Auth owns and `lib/schema.ts` therefore does not declare, so they are made
 * in raw SQL here. Shared by every integration file rather than restated in
 * each, and a file of its own because importing one test file from another
 * would run its tests twice.
 */

export const newViewer = async (): Promise<string> => {
  const email = `itest-${crypto.randomUUID()}@example.test`;

  const { rows } = await db.execute<{ id: string }>(sql`
    insert into neon_auth."user" (name, email, "emailVerified")
    values ('Integration Viewer', ${email}, false)
    returning id
  `);

  const id = rows[0]?.id;

  if (!id) throw new Error('neon_auth."user" insert returned no id');

  return id;
};

/** Takes the Viewer's Watch Records with it, through the foreign key. */
export const dropViewer = async (id: string): Promise<void> => {
  await db.execute(sql`delete from neon_auth."user" where id = ${id}::uuid`);
};

/**
 * A factory whose Viewers are dropped when the file's tests are done. Called
 * at the top of a test file, so the `afterAll` it registers belongs to that
 * file.
 */
export const disposableViewers = (): (() => Promise<string>) => {
  const ids: string[] = [];

  afterAll(async () => {
    for (const id of ids) await dropViewer(id);
  });

  return async () => {
    const id = await newViewer();
    ids.push(id);

    return id;
  };
};
