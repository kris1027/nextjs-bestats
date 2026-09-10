import { expect, test } from 'vitest';

import { isMediaId, openKind } from '@/lib/media';

test('isMediaId admits a positive integer', () => {
  expect(isMediaId('1')).toBe(true);
  expect(isMediaId('1399')).toBe(true);
  expect(isMediaId('999999999')).toBe(true);
});

test('isMediaId refuses what cannot be a TMDB id', () => {
  expect(isMediaId('')).toBe(false);
  expect(isMediaId('0')).toBe(false);
  expect(isMediaId('01')).toBe(false);
  expect(isMediaId('-1')).toBe(false);
  expect(isMediaId('1.5')).toBe(false);
  expect(isMediaId('1e3')).toBe(false);
  expect(isMediaId(' 1')).toBe(false);
  expect(isMediaId('1399abc')).toBe(false);
  expect(isMediaId('1000000000')).toBe(false);
});

test('openKind opens the Kind with something in it', () => {
  expect(openKind({ tv: true, movie: false })).toBe('tv');
  expect(openKind({ tv: false, movie: true })).toBe('movie');
});

test('openKind opens Shows where both have something and where neither does', () => {
  expect(openKind({ tv: true, movie: true })).toBe('tv');
  expect(openKind({ tv: false, movie: false })).toBe('tv');
});
