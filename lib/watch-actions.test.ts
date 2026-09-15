import { afterEach, expect, test, vi } from 'vitest';

import { MARKING_FIELD, PLANNED, STOPPED, watchedAt } from '@/lib/watch';
import { mark, scoreEpisode, unscoreEpisode } from '@/lib/watch-actions';

/**
 * What `mark` does when the database refuses, which is the one branch
 * `lib/watch-actions.integration.test.ts` cannot reach: it runs against a
 * branch CI has just migrated, where the queries work.
 *
 * Production spent weeks in this branch. `marking_tallies` had never been
 * created there, so `tallyMarking` threw `42P01` on every press and the
 * Viewer was told to try again in a moment. These tests pin the two halves
 * that mattered: the Visitor gets a sentence rather than a stack trace, and
 * the cause reaches the server log, which is where the answer turned out to
 * be.
 * — `docs/adr/0009-every-environment-is-a-neon-branch.md`
 *
 * A unit test because mocking the queries is also what keeps `lib/db` — whose
 * import throws without `DATABASE_URL` — out of the module graph, so this
 * runs on a commit and in CI's first job.
 */

const queries = vi.hoisted(() => ({
  tallyMarking: vi.fn(),
  watchLookup: vi.fn(),
  writeWatchRecord: vi.fn(),
  clearWatchRecord: vi.fn(),
  episodeLookup: vi.fn(),
  showEpisodeLookup: vi.fn(),
  writeEpisodeRecord: vi.fn(),
  clearEpisodeRecord: vi.fn(),
  writePlannedShow: vi.fn(),
  writeStoppedShow: vi.fn(),
}));

vi.mock('@/lib/watch-queries', () => queries);

// TMDB's answer about an Episode, which is where scoring learns its id, its
// Show and whether it has aired; the rest of `lib/media` is the real thing
const media = vi.hoisted(() => ({ episodeDetails: vi.fn() }));

vi.mock('@/lib/media', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/media')>()),
  episodeDetails: media.episodeDetails,
}));

// the same stand-in the integration file uses: `mark` reads the Viewer from
// the session and from nowhere else
vi.mock('@/lib/auth', () => ({
  answeredViewer: async () => ({
    answer: 'viewer',
    viewer: { id: 'a-viewer', name: 'Action Viewer', image: null },
  }),
}));

/** What the marking control posts. */
const press = (): FormData => {
  const formData = new FormData();

  formData.set('kind', 'tv');
  formData.set('id', '236235');
  formData.set(MARKING_FIELD, 'planned');
  formData.set('next', '/tv/236235');

  return formData;
};

/** The error production actually raised, as the driver hands it over. */
const missingTable = Object.assign(
  new Error('relation "marking_tallies" does not exist'),
  { code: '42P01' },
);

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

test('a query that throws reaches the Viewer as a sentence, not a throw', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  queries.tallyMarking.mockRejectedValue(missingTable);

  expect(await mark(press())).toEqual({
    error: 'Could not mark that. Try again in a moment.',
  });
});

test('the cause reaches the log, naming the Media the press was for', async () => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  queries.tallyMarking.mockRejectedValue(missingTable);

  await mark(press());

  // `tv/236235` is what made the production log searchable, and the cause is
  // the whole diagnosis — neither may be swallowed with the message
  expect(logged).toHaveBeenCalledWith(
    'Marking tv/236235 failed:',
    missingTable,
  );
});

test('a write that throws after the reads succeed is reported the same way', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  queries.tallyMarking.mockResolvedValue(1);
  queries.watchLookup.mockResolvedValue(new Map());
  // the press is Planned on a Show, so the write is the one that refuses a
  // Show under way
  queries.writePlannedShow.mockRejectedValue(new Error('the write failed'));

  expect(await mark(press())).toEqual({
    error: 'Could not mark that. Try again in a moment.',
  });
});

test('the press is counted before anything is read or written', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  queries.tallyMarking.mockRejectedValue(missingTable);

  await mark(press());

  // the guard runs first on purpose, so a refused press costs one statement.
  // The cost is that its own table going missing takes marking with it, which
  // is exactly what happened — failing open would be worse, so this stands.
  expect(queries.tallyMarking).toHaveBeenCalledWith('a-viewer');
  expect(queries.watchLookup).not.toHaveBeenCalled();
  expect(queries.writePlannedShow).not.toHaveBeenCalled();
});

test('a marking our own form could not have posted is a throw, not a message', async () => {
  const tampered = press();

  tampered.set(MARKING_FIELD, '11');

  // thrown rather than returned: every value a button can post is a marking,
  // so this is a form nobody in the app rendered, and there is nothing to
  // tell the Visitor that would help them
  await expect(mark(tampered)).rejects.toThrow('Not a marking: 11');
  expect(queries.tallyMarking).not.toHaveBeenCalled();
});

test('a Score pressed for a Show is a throw, and nothing is counted', async () => {
  const scored = press();

  scored.set(MARKING_FIELD, '8');

  // the database would refuse the row as well, but the Show's page draws no
  // stars, so a Score for one is a form nobody in the app rendered
  await expect(mark(scored)).rejects.toThrow('A Show is never Watched: 8');
  expect(queries.tallyMarking).not.toHaveBeenCalled();
  expect(queries.writeWatchRecord).not.toHaveBeenCalled();
});

test('Planned is refused on a Show the Viewer is under way with, and nothing is written', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.watchLookup.mockResolvedValue(new Map());
  // the write refuses in the same statement that would have made it, so an
  // Episode scored after the page was drawn cannot slip between the two
  queries.writePlannedShow.mockResolvedValue(false);

  // a stale page still drawing Planned: the Show's Episodes say where the
  // Viewer is now, and Planned would say they had not started
  expect(await mark(press())).toEqual({
    error: 'You are already watching this show.',
  });
  expect(queries.writePlannedShow).toHaveBeenCalledWith('a-viewer', 236235);
  expect(queries.writeWatchRecord).not.toHaveBeenCalled();
});

test('Planned on a Show not under way is written, and says Planned', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.watchLookup.mockResolvedValue(new Map());
  queries.writePlannedShow.mockResolvedValue(true);

  expect(await mark(press())).toEqual({ marking: PLANNED });
  expect(queries.writeWatchRecord).not.toHaveBeenCalled();
});

/** What a Show's page posts when Stop watching or Stopped is pressed. */
const stop = (kind = 'tv'): FormData => {
  const formData = press();

  formData.set('kind', kind);
  formData.set(MARKING_FIELD, 'stopped');

  return formData;
};

test('Stopped pressed for a Movie is a throw, and nothing is counted', async () => {
  // the database would refuse the row as well, but a Movie's page draws no
  // way to stop one
  await expect(mark(stop('movie'))).rejects.toThrow(
    'A Movie is never Stopped: stopped',
  );
  expect(queries.tallyMarking).not.toHaveBeenCalled();
});

test('Stopped is refused on a Show the Viewer has not started, and nothing is written', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.watchLookup.mockResolvedValue(new Map());
  // refused in the statement that would have written it, as Planned is
  queries.writeStoppedShow.mockResolvedValue(false);

  expect(await mark(stop())).toEqual({
    error: 'You have not started this show yet.',
  });
  expect(queries.writeStoppedShow).toHaveBeenCalledWith('a-viewer', 236235);
  expect(queries.writeWatchRecord).not.toHaveBeenCalled();
});

test('Stopped on a Show under way is written, and says Stopped', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.watchLookup.mockResolvedValue(new Map());
  queries.writeStoppedShow.mockResolvedValue(true);

  expect(await mark(stop())).toEqual({ marking: STOPPED });
  expect(queries.writeWatchRecord).not.toHaveBeenCalled();
});

test('Stopped pressed on a Stopped Show deletes the record, started or not', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.watchLookup.mockResolvedValue(new Map([['tv/236235', STOPPED]]));

  // no Episodes are asked about: unscoring them all leaves a Stopped record,
  // and the Viewer can still take it back
  expect(await mark(stop())).toEqual({ marking: null });
  expect(queries.clearWatchRecord).toHaveBeenCalledWith('a-viewer', {
    kind: 'tv',
    id: 236235,
  });
  expect(queries.writeStoppedShow).not.toHaveBeenCalled();
});

/*
 * Scoring an Episode. Its refusals are TMDB's answer and the guard's, which a
 * unit test reaches with both mocked; the writes themselves are exercised
 * against Postgres in the integration file.
 */

/** What an Episode page's star row posts: the position, and the Score. */
const score = (value: string): FormData => {
  const formData = new FormData();

  formData.set('show', '95396');
  formData.set('season', '1');
  formData.set('episode', '2');
  formData.set(MARKING_FIELD, value);
  formData.set('next', '/tv/95396/season/1/episode/2');

  return formData;
};

/** Enough of TMDB's answer for scoring: the id, the Show, the air date. */
const halfLoop = (airDate: string | null) => ({
  id: 3396429,
  airDate,
  show: { id: 95396, label: 'Severance' },
});

test('an Episode that has not aired is refused, and nothing is written', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  media.episodeDetails.mockResolvedValue(halfLoop('2999-01-01'));

  expect(await scoreEpisode(score('8'))).toEqual({
    error: 'That episode has not aired yet.',
  });
  expect(queries.episodeLookup).not.toHaveBeenCalled();
  expect(queries.writeEpisodeRecord).not.toHaveBeenCalled();
});

test('an Episode with no air date is refused the same way', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  media.episodeDetails.mockResolvedValue(halfLoop(null));

  expect(await scoreEpisode(score('8'))).toEqual({
    error: 'That episode has not aired yet.',
  });
  expect(queries.writeEpisodeRecord).not.toHaveBeenCalled();
});

test("a Score is written against TMDB's id for the Episode and its Show", async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.episodeLookup.mockResolvedValue(new Map());
  media.episodeDetails.mockResolvedValue(halfLoop('2022-02-17'));

  expect(await scoreEpisode(score('8'))).toEqual({ marking: watchedAt(8) });
  expect(media.episodeDetails).toHaveBeenCalledWith({
    showId: 95396,
    season: 1,
    episode: 2,
  });
  expect(queries.writeEpisodeRecord).toHaveBeenCalledWith(
    'a-viewer',
    { episodeId: 3396429, showId: 95396 },
    watchedAt(8),
  );
});

test('pressing the Score an Episode already holds unscores it', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.episodeLookup.mockResolvedValue(new Map([[3396429, watchedAt(8)]]));
  media.episodeDetails.mockResolvedValue(halfLoop('2022-02-17'));

  expect(await scoreEpisode(score('8'))).toEqual({ marking: null });
  expect(queries.clearEpisodeRecord).toHaveBeenCalledWith('a-viewer', 3396429);
  expect(queries.writeEpisodeRecord).not.toHaveBeenCalled();
});

test('an Episode TMDB no longer lists is a sentence, not a throw', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  media.episodeDetails.mockResolvedValue(null);

  expect(await scoreEpisode(score('8'))).toEqual({
    error: 'TMDB no longer lists that episode.',
  });
});

test('a press of an Episode is counted before TMDB is asked', async () => {
  queries.tallyMarking.mockResolvedValue(61);

  expect(await scoreEpisode(score('8'))).toEqual({
    error: 'Slow down. Try again in a minute.',
  });
  expect(media.episodeDetails).not.toHaveBeenCalled();
});

test('Planned is not a marking an Episode can be pressed into', async () => {
  // no button on an Episode's page posts it, so it is a throw like any other
  // form nobody in the app rendered
  await expect(scoreEpisode(score('planned'))).rejects.toThrow(
    'Not a Score: planned',
  );
  expect(queries.tallyMarking).not.toHaveBeenCalled();
});

test('TMDB failing reaches the Viewer as a sentence and the log as its cause', async () => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  const cause = new Error('TMDB 503');

  queries.tallyMarking.mockResolvedValue(1);
  media.episodeDetails.mockRejectedValue(cause);

  expect(await scoreEpisode(score('8'))).toEqual({
    error: 'Could not score that. Try again in a moment.',
  });
  expect(logged).toHaveBeenCalledWith('Scoring tv/95396 S1E2 failed:', cause);
});

/** What a Show's page posts to unscore a Gone Episode: its id and its Show. */
const unscore = (value: string, id = '3396429'): FormData => {
  const formData = new FormData();

  formData.set('show', '95396');
  formData.set('id', id);
  formData.set(MARKING_FIELD, value);
  formData.set('next', '/tv/95396');

  return formData;
};

test("pressing a Gone Episode's Score clears its record, found among its Show's", async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.showEpisodeLookup.mockResolvedValue(
    new Map([[3396429, watchedAt(8)]]),
  );

  expect(await unscoreEpisode(unscore('8'))).toEqual({ marking: null });
  expect(queries.showEpisodeLookup).toHaveBeenCalledWith('a-viewer', 95396);
  expect(queries.clearEpisodeRecord).toHaveBeenCalledWith('a-viewer', 3396429);
  // a Gone Episode has no position to ask about, and unscoring needs none
  expect(media.episodeDetails).not.toHaveBeenCalled();
});

test('a Score the record no longer holds is refused rather than written', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.showEpisodeLookup.mockResolvedValue(
    new Map([[3396429, watchedAt(3)]]),
  );

  expect(await unscoreEpisode(unscore('8'))).toEqual({
    error: 'Your score for that episode changed elsewhere. Reload to see it.',
  });
  expect(queries.clearEpisodeRecord).not.toHaveBeenCalled();
  expect(queries.writeEpisodeRecord).not.toHaveBeenCalled();
});

test('unscoring an Episode with no record, or one under another Show, writes nothing', async () => {
  queries.tallyMarking.mockResolvedValue(1);
  queries.showEpisodeLookup.mockResolvedValue(
    new Map([[3396430, watchedAt(8)]]),
  );

  // the press would make a Score of nothing, which only an Episode's page
  // gives, so the answer is the record as it is: none
  expect(await unscoreEpisode(unscore('8'))).toEqual({ marking: null });
  expect(queries.clearEpisodeRecord).not.toHaveBeenCalled();
  expect(queries.writeEpisodeRecord).not.toHaveBeenCalled();
});

test('an unscore press is counted before the record is read', async () => {
  queries.tallyMarking.mockResolvedValue(61);

  expect(await unscoreEpisode(unscore('8'))).toEqual({
    error: 'Slow down. Try again in a minute.',
  });
  expect(queries.showEpisodeLookup).not.toHaveBeenCalled();
});

test('an unscore form our own page could not have posted is a throw', async () => {
  await expect(unscoreEpisode(unscore('planned'))).rejects.toThrow(
    'Not a Score: planned',
  );
  await expect(unscoreEpisode(unscore('8', 'S1E2'))).rejects.toThrow(
    'Not a TMDB id: S1E2',
  );
  expect(queries.tallyMarking).not.toHaveBeenCalled();
});

test('a failed unscore reaches the Viewer as a sentence and the log as its cause', async () => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  const cause = new Error('connection reset');

  queries.tallyMarking.mockResolvedValue(1);
  queries.showEpisodeLookup.mockRejectedValue(cause);

  expect(await unscoreEpisode(unscore('8'))).toEqual({
    error: 'Could not unscore that. Try again in a moment.',
  });
  expect(logged).toHaveBeenCalledWith(
    'Unscoring tv/95396 episode 3396429 failed:',
    cause,
  );
});
