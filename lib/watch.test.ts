import { expect, test } from 'vitest';

import {
  isWatchState,
  marked,
  toLookup,
  WATCH_STATES,
  watchKey,
} from '@/lib/watch';

test('marking Media with no Watch Record creates one in the pressed state', () => {
  expect(marked(null, 'planned')).toBe('planned');
  expect(marked(null, 'watched')).toBe('watched');
});

test('marking the other state moves the Watch Record', () => {
  expect(marked('planned', 'watched')).toBe('watched');
  expect(marked('watched', 'planned')).toBe('planned');
});

test('marking the state a Watch Record already has unmarks it', () => {
  expect(marked('planned', 'planned')).toBe(null);
  expect(marked('watched', 'watched')).toBe(null);
});

test('every state is reachable from every other in one press', () => {
  for (const current of [null, ...WATCH_STATES]) {
    for (const pressed of WATCH_STATES) {
      expect(marked(current, pressed)).toBe(
        current === pressed ? null : pressed,
      );
    }
  }
});

test('isWatchState admits the two states and nothing else', () => {
  expect(isWatchState('planned')).toBe(true);
  expect(isWatchState('watched')).toBe(true);
  expect(isWatchState('abandoned')).toBe(false);
  expect(isWatchState('')).toBe(false);
  expect(isWatchState('Planned')).toBe(false);
});

test('watchKey spells a piece of Media the way its URL does', () => {
  expect(watchKey('tv', 1399)).toBe('tv/1399');
  expect(watchKey('movie', 1399)).toBe('movie/1399');
});

test('toLookup keeps the same TMDB id in each Kind apart', () => {
  const lookup = toLookup([
    { kind: 'tv', tmdbId: 1399, state: 'watched' },
    { kind: 'movie', tmdbId: 1399, state: 'planned' },
  ]);

  expect(lookup.get(watchKey('tv', 1399))).toBe('watched');
  expect(lookup.get(watchKey('movie', 1399))).toBe('planned');
});

test('toLookup has nothing for Media the Viewer has said nothing about', () => {
  const lookup = toLookup([{ kind: 'tv', tmdbId: 1399, state: 'planned' }]);

  expect(lookup.get(watchKey('tv', 66732)) ?? null).toBe(null);
  expect(toLookup([]).size).toBe(0);
});
