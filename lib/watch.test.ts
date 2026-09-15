import { expect, test } from 'vitest';

import type { SeasonEpisodes } from '@/lib/media';
import {
  finishedAt,
  isScore,
  marked,
  markingFrom,
  markingOf,
  markingValue,
  PLANNED,
  refOf,
  SCORES,
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
});

test('marking what a Watch Record already says unmarks it', () => {
  expect(marked(PLANNED, PLANNED)).toBe(null);
  expect(marked(watchedAt(7), watchedAt(7))).toBe(null);
});

test('a different Score rescores rather than unmarks', () => {
  expect(marked(watchedAt(7), watchedAt(8))).toEqual(watchedAt(8));
  expect(marked(watchedAt(1), watchedAt(10))).toEqual(watchedAt(10));
});

test('every marking is reachable from every other in one press', () => {
  const markings = [PLANNED, ...SCORES.map(watchedAt)];

  // Media with no Watch Record agrees with nothing, so all eleven mark it
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
  expect(markingFrom('1')).toEqual(watchedAt(1));
  expect(markingFrom('10')).toEqual(watchedAt(10));

  expect(markingFrom('watched')).toBe(null);
  expect(markingFrom('0')).toBe(null);
  expect(markingFrom('11')).toBe(null);
  expect(markingFrom('7.5')).toBe(null);
  expect(markingFrom('')).toBe(null);
  expect(markingFrom('Planned')).toBe(null);
});

test('every marking survives the round trip through a form field', () => {
  for (const marking of [PLANNED, ...SCORES.map(watchedAt)]) {
    expect(markingFrom(markingValue(marking))).toEqual(marking);
  }
});

test('toMarking makes one value of the two columns a row holds', () => {
  expect(toMarking({ state: 'planned', score: null })).toEqual(PLANNED);
  expect(toMarking({ state: 'watched', score: 9 })).toEqual(watchedAt(9));
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

/** The Episode `upNext` names, at the fixture's air date. */
const episodeAt = (season: number, episode: number) => ({
  episode: { season, episode },
  airDate: '2022-02-17',
});

test('the next Episode of a Show the Viewer has scored nothing of is its first', () => {
  expect(upNext([season(1, 3), season(2, 3)], new Set())).toEqual(
    episodeAt(1, 1),
  );
});

test('the next Episode follows the furthest scored, not the earliest unscored', () => {
  // S1E2 was never scored, and S2E2 is still the Episode after S2E1
  expect(
    upNext([season(1, 3), season(2, 3)], new Set([101, 103, 201])),
  ).toEqual(episodeAt(2, 2));
});

test('the next Episode after the last of a season is the first of the next', () => {
  expect(upNext([season(1, 3), season(2, 3)], new Set([103]))).toEqual(
    episodeAt(2, 1),
  );
});

test('a scored Special never counts towards the furthest Episode', () => {
  expect(
    upNext([season(1, 3), season(2, 3), season(0, 2)], new Set([201, 2])),
  ).toEqual(episodeAt(2, 2));
});

test('a Special is never the next Episode', () => {
  expect(upNext([season(0, 2), season(1, 3)], new Set())).toEqual(
    episodeAt(1, 1),
  );
  expect(upNext([season(1, 3), season(0, 2)], new Set([103]))).toEqual({
    season: null,
  });
});

test('the next Episode carries the day TMDB says it airs, or none', () => {
  const undated = {
    number: 2,
    episodes: [{ id: 201, number: 1, airDate: null }],
  };

  expect(upNext([season(1, 1), undated], new Set([101]))).toEqual({
    episode: { season: 2, episode: 1 },
    airDate: null,
  });
});

test('a Viewer caught up with a Show waits on the season TMDB has announced', () => {
  expect(
    upNext([season(1, 3), season(2, 3), season(3, 0)], new Set([203])),
  ).toEqual({ season: 3 });
});

test('a Viewer caught up with a Show TMDB has announced nothing more of waits on no season', () => {
  expect(upNext([season(1, 3), season(2, 3)], new Set([203]))).toEqual({
    season: null,
  });
});

test('an announced season before the furthest scored is not waited on', () => {
  expect(
    upNext([season(1, 3), season(2, 0), season(3, 3)], new Set([303])),
  ).toEqual({ season: null });
});

test('a Show with nothing but an announced season waits on it', () => {
  expect(upNext([season(1, 0)], new Set())).toEqual({ season: 1 });
});

test('a scored Episode TMDB no longer lists never counts towards the furthest', () => {
  expect(upNext([season(1, 3), season(2, 3)], new Set([102, 999]))).toEqual(
    episodeAt(1, 3),
  );
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
