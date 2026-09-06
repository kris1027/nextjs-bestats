import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { markingTallies } from '@/lib/schema';

/**
 * For the integration project: moves a Viewer's marking window back so the
 * next press finds it over, rather than waiting a minute for it to be. In a
 * file of its own because two test files need it, and importing one test
 * file from another runs its tests twice.
 */
export const expireMarkingWindow = async (viewerId: string): Promise<void> => {
  await db
    .update(markingTallies)
    .set({ windowStart: sql`now() - interval '61 seconds'` })
    .where(eq(markingTallies.viewerId, viewerId));
};
