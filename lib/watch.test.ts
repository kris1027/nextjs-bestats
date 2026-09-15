import { expect, test } from 'vitest';

import type { SeasonEpisodes, ShowEpisodesAnswer } from '@/lib/media';
import {
  type EpisodeLookup,
  finishedAt,
  goneEpisodes,
  hasFinished,
  isScore,
  marked,
  markingFrom,
  markingOf,
  markingsAgree,
  markingValue,
  PLANNED,
  refOf,
  SCORES,
  type Score,
  STOPPED,
  showPress,
  showProgress,
  takesScore,
  toLookup,
  toMarkedMedia,
  toMarking,
  upNext,
  watchedAt,
  watchKey,
} from '@/lib/watch';

test('marking Media with no Watch Record creates one saying what was pressed', () => {
  expect(marked(null, PLANNED)).toEqual(PLANNED);
  expect(marked(null, watchedAt(7))).toEqual(watchedAt(7));
});

test('marking the other state moves the Watch Record', () => {
  expect(marked(PLANNED, watchedAt(7))).toEqual(watchedAt(7));
  expect(marked(watchedAt(7), PLANNED)).toEqual(PLANNED);
  expect(marked(PLANNED, STOPPED)).toEqual(STOPPED);
});

test('marking what a Watch Record already says unmarks it', () => {
  expect(marked(PLANNED, PLANNED)).toBe(null);
  expect(marked(watchedAt(7), watchedAt(7))).toBe(null);
  expect(marked(STOPPED, STOPPED)).toBe(null);
});

test('a different Score rescores rather than unmarks', () => {
  expect(marked(watchedAt(7), watchedAt(8))).toEqual(watchedAt(8));
  expect(marked(watchedAt(1), watchedAt(10))).toEqual(watchedAt(10));
});

test('every marking is reachable from every other in one press', () => {
  const markings = [PLANNED, STOPPED, ...SCORES.map(watchedAt)];

  // Media with no Watch Record agrees with nothing, so all twelve mark it
  for (const pressed of markings)
    expect(marked(null, pressed)).toEqual(pressed);

  // and a record is unmarked by its own marking and no other. Which one that
  // is, is its place in the list — restating `markingsAgree` as the
  // expectation would be an oracle that cannot disagree with the code.
  markings.forEach((current, held) => {
    markings.forEach((pressed, index) => {
      expect(marked(current, pressed)).toEqual(held === index ? null : pressed);
    });
  });
});

test('isScore admits one to ten whole and nothing else', () => {
  for (const score of SCORES) expect(isScore(score)).toBe(true);

  expect(isScore(0)).toBe(false);
  expect(isScore(11)).toBe(false);
  expect(isScore(-1)).toBe(false);
  expect(isScore(7.5)).toBe(false);
  expect(isScore(Number.NaN)).toBe(false);
});

test('markingFrom reads the field the buttons post and refuses the rest', () => {
  expect(markingFrom('planned')).toEqual(PLANNED);
  expect(markingFrom('stopped')).toEqual(STOPPED);
  expect(markingFrom('1')).toEqual(watchedAt(1));
  expect(markingFrom('10')).toEqual(watchedAt(10));

  expect(markingFrom('watched')).toBe(null);
  expect(markingFrom('0')).toBe(null);
  expect(markingFrom('11')).toBe(null);
  expect(markingFrom('7.5')).toBe(null);
  expect(markingFrom('')).toBe(null);
  expect(markingFrom('Planned')).toBe(null);
  expect(markingFrom('dropped')).toBe(null);
});

test('every marking survives the round trip through a form field', () => {
  for (const marking of [PLANNED, STOPPED, ...SCORES.map(watchedAt)]) {
    expect(markingFrom(markingValue(marking))).toEqual(marking);
  }
});

test('toMarking makes one value of the two columns a row holds', () => {
  expect(toMarking({ state: 'planned', score: null })).toEqual(PLANNED);
  expect(toMarking({ state: 'watched', score: 9 })).toEqual(watchedAt(9));
  expect(toMarking({ state: 'stopped', score: null })).toEqual(STOPPED);
});

test('a Watched row with no Score is a row that cannot exist', () => {
  expect(() => toMarking({ state: 'watched', score: null })).toThrow();
  expect(() => toMarking({ state: 'watched', score: 0 })).toThrow();
  expect(() => toMarking({ state: 'watched', score: 11 })).toThrow();
});

test('watchKey spells a piece of Media the way its URL does', () => {
  expect(watchKey({ kind: 'tv', id: 1399 })).toBe('tv/1399');
  expect(watchKey({ kind: 'movie', id: 1399 })).toBe('movie/1399');
});

test('toLookup holds a Stopped Show as Stopped', () => {
  const lookup = toLookup([{ kind: 'tv', tmdbId: 1399, ...STOPPED }]);

  expect(markingOf(lookup, { kind: 'tv', id: 1399 })).toEqual(STOPPED);
});

test('toLookup keeps the same TMDB id in each Kind apart', () => {
  const lookup = toLookup([
    { kind: 'tv', tmdbId: 1399, ...watchedAt(9) },
    { kind: 'movie', tmdbId: 1399, ...PLANNED },
  ]);

  expect(markingOf(lookup, { kind: 'tv', id: 1399 })).toEqual(watchedAt(9));
  expect(markingOf(lookup, { kind: 'movie', id: 1399 })).toEqual(PLANNED);
});

test('toLookup has nothing for Media the Viewer has said nothing about', () => {
  const lookup = toLookup([{ kind: 'tv', tmdbId: 1399, ...PLANNED }]);

  expect(markingOf(lookup, { kind: 'tv', id: 66732 })).toBe(null);
  expect(markingOf(toLookup([]), { kind: 'tv', id: 1399 })).toBe(null);
});

test('toMarkedMedia makes a marking of a row and keeps the Media', () => {
  expect(
    toMarkedMedia({ kind: 'tv', tmdbId: 1399, state: 'watched', score: 9 }),
  ).toEqual({ kind: 'tv', tmdbId: 1399, ...watchedAt(9) });
  expect(
    toMarkedMedia({
      kind: 'movie',
      tmdbId: 603,
      state: 'planned',
      score: null,
    }),
  ).toEqual({ kind: 'movie', tmdbId: 603, ...PLANNED });
});

test("a Movie's record takes a Score, and a Show's never does", () => {
  expect(takesScore('movie')).toBe(true);
  expect(takesScore('tv')).toBe(false);
});

test('refOf spells a Watch Record the way lib/media spells a ref', () => {
  expect(refOf({ kind: 'tv', tmdbId: 1399 })).toEqual({ kind: 'tv', id: 1399 });
});

// Episode ids are season * 100 + number, so a failure names the Episode
const season = (number: number, episodes: number): SeasonEpisodes => ({
  number,
  episodes: Array.from({ length: episodes }, (_, index) => ({
    id: number * 100 + index + 1,
    number: index + 1,
    airDate: '2022-02-17',
  })),
});

/** Episodes scored, by id; `upNext` never reads when. */
const scored = (ids: number[]): Map<number, Date> =>
  new Map(ids.map((id) => [id, new Date(0)]));

/** The Episode `upNext` names, at the fixture's air date. */
const episodeAt = (season: number, episode: number) => ({
  episode: { season, episode },
  airDate: '2022-02-17',
});

test('the next Episode of a Show the Viewer has scored nothing of is its first', () => {
  expect(upNext([season(1, 3), season(2, 3)], scored([]))).toEqual(
    episodeAt(1, 1),
  );
});

test('the next Episode follows the furthest scored, not the earliest unscored', () => {
  // S1E2 was never scored, and S2E2 is still the Episode after S2E1
  expect(upNext([season(1, 3), season(2, 3)], scored([101, 103, 201]))).toEqual(
    episodeAt(2, 2),
  );
});

test('the next Episode after the last of a season is the first of the next', () => {
  expect(upNext([season(1, 3), season(2, 3)], scored([103]))).toEqual(
    episodeAt(2, 1),
  );
});

test('a scored Special never counts towards the furthest Episode', () => {
  expect(
    upNext([season(1, 3), season(2, 3), season(0, 2)], scored([201, 2])),
  ).toEqual(episodeAt(2, 2));
});

test('a Special is never the next Episode', () => {
  expect(upNext([season(0, 2), season(1, 3)], scored([]))).toEqual(
    episodeAt(1, 1),
  );
  expect(upNext([season(1, 3), season(0, 2)], scored([103]))).toEqual({
    season: null,
  });
});

test('the next Episode carries the day TMDB says it airs, or none', () => {
  const undated = {
    number: 2,
    episodes: [{ id: 201, number: 1, airDate: null }],
  };

  expect(upNext([season(1, 1), undated], scored([101]))).toEqual({
    episode: { season: 2, episode: 1 },
    airDate: null,
  });
});

test('a Viewer caught up with a Show waits on the season TMDB has announced', () => {
  expect(
    upNext([season(1, 3), season(2, 3), season(3, 0)], scored([203])),
  ).toEqual({ season: 3 });
});

test('a Viewer caught up with a Show TMDB has announced nothing more of waits on no season', () => {
  expect(upNext([season(1, 3), season(2, 3)], scored([203]))).toEqual({
    season: null,
  });
});

test('an announced season before the furthest scored is not waited on', () => {
  expect(
    upNext([season(1, 3), season(2, 0), season(3, 3)], scored([303])),
  ).toEqual({ season: null });
});

test('a Show with nothing but an announced season waits on it', () => {
  expect(upNext([season(1, 0)], scored([]))).toEqual({ season: 1 });
});

test('a scored Episode TMDB no longer lists never counts towards the furthest', () => {
  expect(upNext([season(1, 3), season(2, 3)], scored([102, 999]))).toEqual(
    episodeAt(1, 3),
  );
});

test('a Gone Episode never counts towards the furthest among Specials either', () => {
  // the seasons as a Show's page asks for them, Specials last: a Gone id
  // and a scored Special beside it still leave S1E3 next
  expect(
    upNext([season(1, 3), season(2, 3), season(0, 2)], scored([102, 2, 999])),
  ).toEqual(episodeAt(1, 3));
});

/** When Episodes were scored, as days of September 2026. */
const scoredOn = (days: Record<number, number>): Map<number, Date> =>
  new Map(
    Object.entries(days).map(([id, day]) => [
      Number(id),
      new Date(Date.UTC(2026, 8, day)),
    ]),
  );

test('a Viewer finished an ended Show when they scored its final Episode', () => {
  expect(
    finishedAt(
      { ended: true, seasons: [season(1, 2), season(2, 2)] },
      scoredOn({ 101: 1, 102: 2, 201: 3, 202: 4 }),
    ),
  ).toEqual(new Date(Date.UTC(2026, 8, 4)));
});

test('a Show is finished at its final Episode, not at the latest Episode rescored', () => {
  expect(
    finishedAt(
      { ended: true, seasons: [season(1, 2)] },
      scoredOn({ 101: 20, 102: 4 }),
    ),
  ).toEqual(new Date(Date.UTC(2026, 8, 4)));
});

test('a Show that has not ended is not finished, with nothing left to watch', () => {
  expect(
    finishedAt(
      { ended: false, seasons: [season(1, 2)] },
      scoredOn({ 101: 1, 102: 2 }),
    ),
  ).toBe(null);
});

test('an ended Show with a dated Episode left is not finished', () => {
  const final = {
    number: 2,
    episodes: [{ id: 201, number: 1, airDate: '2027-03-12' }],
  };

  expect(
    finishedAt(
      { ended: true, seasons: [season(1, 2), final] },
      scoredOn({ 101: 1, 102: 2 }),
    ),
  ).toBe(null);
});

test('an ended Show with a season announced after the furthest is not finished', () => {
  expect(
    finishedAt(
      { ended: true, seasons: [season(1, 2), season(2, 0)] },
      scoredOn({ 101: 1, 102: 2 }),
    ),
  ).toBe(null);
});

test('an ended Show with no Episodes, or none scored, is not finished', () => {
  expect(finishedAt({ ended: true, seasons: [] }, new Map())).toBe(null);
  expect(finishedAt({ ended: true, seasons: [season(1, 2)] }, new Map())).toBe(
    null,
  );
});

test('an unscored Special does not keep an ended Show from being finished', () => {
  expect(
    finishedAt(
      { ended: true, seasons: [season(1, 2), season(0, 3)] },
      scoredOn({ 102: 5 }),
    ),
  ).toEqual(new Date(Date.UTC(2026, 8, 5)));
});

test('a Gone Episode scored last is not when an ended Show was finished', () => {
  expect(
    finishedAt(
      { ended: true, seasons: [season(1, 2), season(0, 1)] },
      scoredOn({ 101: 1, 102: 2, 999: 9 }),
    ),
  ).toEqual(new Date(Date.UTC(2026, 8, 2)));
});

/**
 * A Viewer's Episode records for one Show, as id and Score pairs: pairs and
 * not an object, whose integer keys would come back sorted.
 */
const records = (...scores: [number, Score][]): EpisodeLookup =>
  new Map(scores.map(([id, score]) => [id, watchedAt(score)]));

/** TMDB's answer listing these seasons, for a Show that has not ended. */
const listing = (...seasons: SeasonEpisodes[]): ShowEpisodesAnswer => ({
  answer: 'show',
  show: { ended: false, seasons },
});

test('a record for an Episode TMDB no longer lists is Gone, with its Score', () => {
  expect(
    goneEpisodes(listing(season(1, 3)), records([101, 8], [999, 6], [102, 7])),
  ).toEqual([{ episodeId: 999, marking: watchedAt(6) }]);
});

test('a scored Special TMDB still lists is not Gone', () => {
  expect(
    goneEpisodes(
      listing(season(1, 2), season(0, 2)),
      records([1, 9], [101, 4]),
    ),
  ).toEqual([]);
});

test('Gone Episodes keep the order the records came in', () => {
  expect(
    goneEpisodes(listing(season(1, 1)), records([998, 3], [101, 5], [997, 10])),
  ).toEqual([
    { episodeId: 998, marking: watchedAt(3) },
    { episodeId: 997, marking: watchedAt(10) },
  ]);
});

test('a Show with no records has no Gone Episodes', () => {
  expect(goneEpisodes(listing(season(1, 3)), records())).toEqual([]);
});

test('an Unanswered season is not reported as Gone', () => {
  // TMDB leaving out any season the Show lists makes the whole answer
  // Unanswered, so no record in the season it did not answer for is Gone
  expect(
    goneEpisodes({ answer: 'unanswered' }, records([101, 8], [201, 6])),
  ).toBe(null);
});

test('a Gone Show has no Gone Episodes to list', () => {
  expect(goneEpisodes({ answer: 'gone' }, records([101, 8]))).toBe(null);
});

/*
 * A Show's own control, one row of the table in #27 each: which button it
 * draws, and whether that button is lit — whether it is what the record
 * already says, so that pressing it deletes the record.
 */

/** The button a Show's control draws and whether it is lit, or `null`. */
const drawn = (
  shown: Parameters<typeof showPress>[0],
  progress: Parameters<typeof showPress>[1],
) => {
  const press = showPress(shown, progress);

  return press && { press, lit: markingsAgree(shown, press) };
};

test('a Show with no record the Viewer has not started draws Planned, off', () => {
  expect(drawn(null, 'unstarted')).toEqual({ press: PLANNED, lit: false });
  expect(marked(null, PLANNED)).toEqual(PLANNED);
});

test('a Planned Show with no Episodes scored draws Planned, on, which deletes it', () => {
  expect(drawn(PLANNED, 'unstarted')).toEqual({ press: PLANNED, lit: true });
  expect(marked(PLANNED, PLANNED)).toBe(null);
});

test('a Show under way with no record draws Stop watching, off, which Stops it', () => {
  expect(drawn(null, 'underWay')).toEqual({ press: STOPPED, lit: false });
  expect(marked(null, STOPPED)).toEqual(STOPPED);
});

test('a Stopped Show draws Stopped, on, which deletes it', () => {
  expect(drawn(STOPPED, 'underWay')).toEqual({ press: STOPPED, lit: true });
  expect(marked(STOPPED, STOPPED)).toBe(null);
});

test('a finished Show draws no control', () => {
  expect(drawn(null, 'finished')).toBe(null);
});

test('a Show not yet started offers no way to Stop it', () => {
  expect(drawn(null, 'unstarted')?.press).not.toEqual(STOPPED);
});

test('a Stopped Show stays Stopped, on, with every Episode unscored or once finished', () => {
  // unscoring every Episode leaves the record, which can still be taken back
  expect(drawn(STOPPED, 'unstarted')).toEqual({ press: STOPPED, lit: true });
  expect(drawn(STOPPED, 'finished')).toEqual({ press: STOPPED, lit: true });
});

test('scoring an Episode of a Stopped Show draws Stop watching, off, again', () => {
  // scoring deletes the Stopped record, so the next render has no record and
  // a Show under way: resumed, and able to be Stopped again
  expect(drawn(STOPPED, 'underWay')?.lit).toBe(true);
  expect(drawn(null, 'underWay')).toEqual({ press: STOPPED, lit: false });
});

test('a Show whose progress went Unanswered draws only the record it holds', () => {
  expect(drawn(null, null)).toBe(null);
  expect(drawn(PLANNED, null)).toEqual({ press: PLANNED, lit: true });
  expect(drawn(STOPPED, null)).toEqual({ press: STOPPED, lit: true });
});

test('a Show is unstarted with nothing scored, without TMDB', () => {
  expect(showProgress({ answer: 'unanswered' }, new Map())).toBe('unstarted');
});

test('a Show with an Episode scored is under way, or finished once it has ended', () => {
  const show = { ended: true, seasons: [season(1, 2)] };

  expect(
    showProgress({ answer: 'show', show }, new Map([[101, watchedAt(8)]])),
  ).toBe('underWay');
  expect(
    showProgress(
      { answer: 'show', show },
      new Map([
        [101, watchedAt(8)],
        [102, watchedAt(9)],
      ]),
    ),
  ).toBe('finished');
});

test('the progress of a Show under way is Unanswered without TMDB', () => {
  const scoredOne = new Map([[101, watchedAt(8)]]);

  expect(showProgress({ answer: 'unanswered' }, scoredOne)).toBe(null);
  expect(showProgress({ answer: 'gone' }, scoredOne)).toBe(null);
});

test('hasFinished needs the final Episode scored, and an ended Show with some', () => {
  const show = { ended: true, seasons: [season(1, 2)] };

  expect(hasFinished(show, scoredOn({ 101: 1, 102: 2 }))).toBe(true);
  expect(hasFinished(show, scoredOn({ 101: 1 }))).toBe(false);
  expect(hasFinished({ ended: true, seasons: [] }, new Map())).toBe(false);
});
