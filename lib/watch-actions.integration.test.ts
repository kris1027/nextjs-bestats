import { eq } from 'drizzle-orm';
import { expect, test, vi } from 'vitest';

import { db } from '@/lib/db';
import { episodeRecords, watchRecords } from '@/lib/schema';
import { expireMarkingWindow } from '@/lib/test-marking';
import { disposableViewers } from '@/lib/test-viewers';
import {
  MARKING_FIELD,
  MARKS_PER_MINUTE,
  PLANNED,
  STOPPED,
  watchedAt,
} from '@/lib/watch';
import { mark, scoreEpisode, unscoreEpisode } from '@/lib/watch-actions';
import { tallyMarking } from '@/lib/watch-queries';

/**
 * `mark` reads the Viewer from the session and from nowhere else, so the
 * session is what these tests stand in for: `answeredViewer()` answers with
 * whichever disposable Viewer the test names, or a Visitor. Restructuring
 * the action to take the Viewer as a parameter would have handed it the
 * client-supplied id it was written to refuse.
 */
const currentViewer = vi.hoisted(() => ({ id: null as string | null }));

vi.mock('@/lib/auth', () => ({
  answeredViewer: async () =>
    currentViewer.id
      ? {
          answer: 'viewer',
          viewer: { id: currentViewer.id, name: 'Action Viewer', image: null },
        }
      : { answer: 'visitor' },
}));

// CI's integration job has no TMDB token, and whether TMDB answers is not
// what these tests are about: scoring is handed an aired Episode here
vi.mock('@/lib/media', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/media')>()),
  episodeDetails: async () => ({
    id: 3396429,
    airDate: '2022-02-17',
    show: { id: 95396, label: 'Severance' },
  }),
}));

const viewer = disposableViewers();

/**
 * What the marking control posts: the Media, the button, and where it was.
 * The button is one field saying `planned` or a Score, because a submit
 * button posts one name and one value.
 */
const press = (kind: string, id: string, marking: string): FormData => {
  const formData = new FormData();

  formData.set('kind', kind);
  formData.set('id', id);
  formData.set(MARKING_FIELD, marking);
  formData.set('next', '/tv/1399');

  return formData;
};

const rowsOf = (viewerId: string) =>
  db.select().from(watchRecords).where(eq(watchRecords.viewerId, viewerId));

test('a press creates the Watch Record, and the same press again unmarks it', async () => {
  currentViewer.id = await viewer();

  expect(await mark(press('tv', '1399', 'planned'))).toEqual({
    marking: PLANNED,
  });
  expect(await rowsOf(currentViewer.id)).toHaveLength(1);

  expect(await mark(press('tv', '1399', 'planned'))).toEqual({ marking: null });
  expect(await rowsOf(currentViewer.id)).toHaveLength(0);
});

test('a press of the Score a record already holds unmarks it', async () => {
  currentViewer.id = await viewer();

  expect(await mark(press('movie', '949', '8'))).toEqual({
    marking: watchedAt(8),
  });
  expect(await mark(press('movie', '949', '8'))).toEqual({ marking: null });
  expect(await rowsOf(currentViewer.id)).toHaveLength(0);
});

test('a press of a different Score rescores rather than unmarks', async () => {
  currentViewer.id = await viewer();

  await mark(press('movie', '949', '8'));

  expect(await mark(press('movie', '949', '3'))).toEqual({
    marking: watchedAt(3),
  });

  const rows = await rowsOf(currentViewer.id);

  expect(rows).toHaveLength(1);
  expect(rows[0]?.score).toBe(3);
});

test('a press of Planned on a scored record moves it and drops the Score', async () => {
  currentViewer.id = await viewer();

  await mark(press('movie', '949', '8'));

  expect(await mark(press('movie', '949', 'planned'))).toEqual({
    marking: PLANNED,
  });

  const rows = await rowsOf(currentViewer.id);

  expect(rows[0]?.state).toBe('planned');
  expect(rows[0]?.score).toBe(null);
});

test('pressing a Score moves the Watch Record and records it', async () => {
  currentViewer.id = await viewer();

  await mark(press('movie', '603', 'planned'));

  expect(await mark(press('movie', '603', '10'))).toEqual({
    marking: watchedAt(10),
  });

  const rows = await rowsOf(currentViewer.id);

  expect(rows).toHaveLength(1);
  expect(rows[0]?.state).toBe('watched');
  expect(rows[0]?.score).toBe(10);
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
    'Not a marking',
  );
  // `watched` is a state and not a marking: reaching Watched means naming a
  // Score, so the word alone is a field our own buttons never post
  await expect(mark(press('tv', '1399', 'watched'))).rejects.toThrow(
    'Not a marking',
  );
  await expect(mark(press('tv', '1399', '11'))).rejects.toThrow(
    'Not a marking',
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

  // one short of the limit through the query itself — its first insert and
  // its increments — rather than a row written by hand, and all at once,
  // which is what a runaway client looks like and what the upsert has to
  // serialise; the last two presses then go through the action
  await Promise.all(
    Array.from({ length: MARKS_PER_MINUTE - 1 }, () =>
      tallyMarking(currentViewer.id as string),
    ),
  );

  expect(await mark(press('tv', '1399', 'planned'))).toEqual({
    marking: PLANNED,
  });
  expect(await mark(press('tv', '1399', 'planned'))).toEqual({
    error: 'Slow down. Try again in a minute.',
  });

  // the refused press wrote nothing: the record is still there
  expect(await rowsOf(currentViewer.id)).toHaveLength(1);

  // and a minute later the window restarts
  await expireMarkingWindow(currentViewer.id);

  expect(await mark(press('tv', '1399', 'planned'))).toEqual({ marking: null });
  // sixty round trips to Neon from a CI runner outrun the 5s default
}, 30_000);

/** What an Episode page's star row posts. */
const scoring = (value: string): FormData => {
  const formData = new FormData();

  formData.set('show', '95396');
  formData.set('season', '1');
  formData.set('episode', '2');
  formData.set(MARKING_FIELD, value);
  formData.set('next', '/tv/95396/season/1/episode/2');

  return formData;
};

const episodesOf = (viewerId: string) =>
  db.select().from(episodeRecords).where(eq(episodeRecords.viewerId, viewerId));

test("a Score records the Episode by TMDB's id, and the same Score again unscores it", async () => {
  currentViewer.id = await viewer();

  expect(await scoreEpisode(scoring('8'))).toEqual({ marking: watchedAt(8) });

  const rows = await episodesOf(currentViewer.id);

  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    episodeId: 3396429,
    showId: 95396,
    score: 8,
  });

  expect(await scoreEpisode(scoring('8'))).toEqual({ marking: null });
  expect(await episodesOf(currentViewer.id)).toHaveLength(0);
});

test('a different Score rescores an Episode rather than adding a record', async () => {
  currentViewer.id = await viewer();

  await scoreEpisode(scoring('8'));

  expect(await scoreEpisode(scoring('3'))).toEqual({ marking: watchedAt(3) });

  const rows = await episodesOf(currentViewer.id);

  expect(rows).toHaveLength(1);
  expect(rows[0]?.score).toBe(3);
});

test("scoring an Episode ends the Show's Planned record", async () => {
  currentViewer.id = await viewer();

  await mark(press('tv', '95396', 'planned'));
  await scoreEpisode(scoring('8'));

  // Planned lasts until the first Episode: the Show is followed through its
  // Episodes from here, so nothing of its own is left to say
  expect(await rowsOf(currentViewer.id)).toHaveLength(0);
  expect(await episodesOf(currentViewer.id)).toHaveLength(1);
});

test("scoring an Episode leaves another Show's Planned record alone", async () => {
  currentViewer.id = await viewer();

  await mark(press('tv', '1399', 'planned'));
  await mark(press('movie', '95396', 'planned'));
  await scoreEpisode(scoring('8'));

  // the Movie shares the Show's TMDB id, which is unique only within a Kind
  expect(await rowsOf(currentViewer.id)).toHaveLength(2);
});

test('Planned is refused on a Show under way, until its last Episode is unscored', async () => {
  currentViewer.id = await viewer();

  await scoreEpisode(scoring('8'));

  expect(await mark(press('tv', '95396', 'planned'))).toEqual({
    error: 'You are already watching this show.',
  });
  expect(await rowsOf(currentViewer.id)).toHaveLength(0);

  // unscoring every Episode leaves nothing, so the Show can be Planned again
  await scoreEpisode(scoring('8'));

  expect(await mark(press('tv', '95396', 'planned'))).toEqual({
    marking: PLANNED,
  });
});

test('a Show is Stopped only once an Episode is scored, and pressing Stopped again deletes it', async () => {
  currentViewer.id = await viewer();

  expect(await mark(press('tv', '95396', 'stopped'))).toEqual({
    error: 'You have not started this show yet.',
  });
  expect(await rowsOf(currentViewer.id)).toHaveLength(0);

  await scoreEpisode(scoring('8'));

  expect(await mark(press('tv', '95396', 'stopped'))).toEqual({
    marking: STOPPED,
  });
  expect(await episodesOf(currentViewer.id)).toHaveLength(1);

  expect(await mark(press('tv', '95396', 'stopped'))).toEqual({
    marking: null,
  });
  expect(await rowsOf(currentViewer.id)).toHaveLength(0);
});

test('a Stopped Movie is a throw, and nothing is written', async () => {
  currentViewer.id = await viewer();

  await expect(mark(press('movie', '949', 'stopped'))).rejects.toThrow(
    'A Movie is never Stopped',
  );
  expect(await rowsOf(currentViewer.id)).toHaveLength(0);
});

test('scoring an Episode of a Stopped Show ends the Stopped record, which is how it resumes', async () => {
  currentViewer.id = await viewer();

  await scoreEpisode(scoring('8'));
  await mark(press('tv', '95396', 'stopped'));

  // rescoring is scoring: the Viewer watched it again
  expect(await scoreEpisode(scoring('9'))).toEqual({ marking: watchedAt(9) });
  expect(await rowsOf(currentViewer.id)).toHaveLength(0);
});

test('unscoring every Episode of a Stopped Show leaves it Stopped', async () => {
  currentViewer.id = await viewer();

  await scoreEpisode(scoring('8'));
  await mark(press('tv', '95396', 'stopped'));

  // the same Score again unscores the only Episode scored
  expect(await scoreEpisode(scoring('8'))).toEqual({ marking: null });

  const rows = await rowsOf(currentViewer.id);

  expect(rows).toHaveLength(1);
  expect(rows[0]?.state).toBe('stopped');
});

/** What a Show's page posts to unscore a Gone Episode. */
const unscoring = (show: string, id: string, value: string): FormData => {
  const formData = new FormData();

  formData.set('show', show);
  formData.set('id', id);
  formData.set(MARKING_FIELD, value);
  formData.set('next', `/tv/${show}`);

  return formData;
};

test("an Episode's Score is unscored by its id, and only under its own Show", async () => {
  currentViewer.id = await viewer();

  await scoreEpisode(scoring('8'));

  // the same id under another Show finds no record of it
  expect(await unscoreEpisode(unscoring('1399', '3396429', '8'))).toEqual({
    marking: null,
  });
  expect(await episodesOf(currentViewer.id)).toHaveLength(1);

  expect(await unscoreEpisode(unscoring('95396', '3396429', '8'))).toEqual({
    marking: null,
  });
  expect(await episodesOf(currentViewer.id)).toHaveLength(0);
});
