import { eq, sql } from 'drizzle-orm';
import { expect, test, vi } from 'vitest';

import { db } from '@/lib/db';
import { markingTallies, watchRecords } from '@/lib/schema';
import { disposableViewers } from '@/lib/test-viewers';
import { MARKS_PER_MINUTE } from '@/lib/watch';
import { mark } from '@/lib/watch-actions';

/**
 * `mark` reads the Viewer from the session and from nowhere else, so the
 * session is what these tests stand in for: `viewer()` answers with whichever
 * disposable Viewer the test names. Restructuring the action to take the
 * Viewer as a parameter would have handed it the client-supplied id it was
 * written to refuse.
 */
const currentViewer = vi.hoisted(() => ({ id: null as string | null }));

vi.mock('@/lib/auth', () => ({
  viewer: async () =>
    currentViewer.id
      ? { id: currentViewer.id, name: 'Action Viewer', image: null }
      : null,
}));

const viewer = disposableViewers();

/** What the marking control posts: the Media, the button, and where it was. */
const press = (kind: string, id: string, state: string): FormData => {
  const formData = new FormData();

  formData.set('kind', kind);
  formData.set('id', id);
  formData.set('state', state);
  formData.set('next', '/tv/1399');

  return formData;
};

const rowsOf = (viewerId: string) =>
  db.select().from(watchRecords).where(eq(watchRecords.viewerId, viewerId));

test('a press creates the Watch Record, and the same press again unmarks it', async () => {
  currentViewer.id = await viewer();

  expect(await mark(press('tv', '1399', 'planned'))).toEqual({
    state: 'planned',
  });
  expect(await rowsOf(currentViewer.id)).toHaveLength(1);

  expect(await mark(press('tv', '1399', 'planned'))).toEqual({ state: null });
  expect(await rowsOf(currentViewer.id)).toHaveLength(0);
});

test('pressing the other state moves the Watch Record', async () => {
  currentViewer.id = await viewer();

  await mark(press('movie', '603', 'planned'));

  expect(await mark(press('movie', '603', 'watched'))).toEqual({
    state: 'watched',
  });

  const rows = await rowsOf(currentViewer.id);

  expect(rows).toHaveLength(1);
  expect(rows[0]?.state).toBe('watched');
});

test('input our own form cannot produce throws rather than returns', async () => {
  currentViewer.id = await viewer();

  await expect(mark(press('book', '1', 'planned'))).rejects.toThrow(
    'Unknown Kind',
  );
  await expect(mark(press('tv', 'abc', 'planned'))).rejects.toThrow(
    'Not a TMDB id',
  );
  await expect(mark(press('tv', '1399', 'seen'))).rejects.toThrow(
    'Unknown state',
  );
});

test('a signed-out press is sent to sign in, carrying where it came from', async () => {
  currentViewer.id = null;

  // `redirect` signals by throwing, and the address is in the digest
  await expect(mark(press('tv', '1399', 'planned'))).rejects.toMatchObject({
    digest: expect.stringContaining('/sign-in?next=%2Ftv%2F1399'),
  });
});

test(`the press after ${MARKS_PER_MINUTE} in a minute is refused, and the one before it is not`, async () => {
  currentViewer.id = await viewer();

  // the tally counts presses, so the row is set to one short of the limit
  // rather than pressed sixty times against a real database
  await db
    .insert(markingTallies)
    .values({ viewerId: currentViewer.id, tally: MARKS_PER_MINUTE - 1 });

  expect(await mark(press('tv', '1399', 'planned'))).toEqual({
    state: 'planned',
  });
  expect(await mark(press('tv', '1399', 'planned'))).toEqual({
    error: 'Slow down. Try again in a minute.',
  });

  // the refused press wrote nothing: the record is still there
  expect(await rowsOf(currentViewer.id)).toHaveLength(1);

  // and a minute later the window restarts
  await db
    .update(markingTallies)
    .set({ windowStart: sql`now() - interval '61 seconds'` })
    .where(eq(markingTallies.viewerId, currentViewer.id));

  expect(await mark(press('tv', '1399', 'planned'))).toEqual({ state: null });
});
