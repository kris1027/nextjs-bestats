import { expect, test } from 'vitest';

import {
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

  for (const current of [null, ...markings]) {
    for (const pressed of markings) {
      expect(marked(current, pressed)).toEqual(
        current !== null &&
          current.state === pressed.state &&
          markingValue(current) === markingValue(pressed)
          ? null
          : pressed,
      );
    }
  }
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
