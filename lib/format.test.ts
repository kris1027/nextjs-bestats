import { expect, test } from 'vitest';

import {
  formatCount,
  formatDate,
  formatNumber,
  formatRuntime,
  formatTally,
} from '@/lib/format';

test('formatRuntime splits minutes into hours and minutes', () => {
  expect(formatRuntime(134)).toBe('2h 14m');
});

test('formatRuntime drops the minutes on an exact hour', () => {
  expect(formatRuntime(120)).toBe('2h');
});

test('formatRuntime drops the hours under an hour', () => {
  expect(formatRuntime(45)).toBe('45m');
});

test('formatRuntime has nothing to say about an unknown runtime', () => {
  expect(formatRuntime(null)).toBe(null);
  expect(formatRuntime(0)).toBe(null);
});

test('formatCount picks the plural form by count', () => {
  expect(formatCount(1, { one: 'season', other: 'seasons' })).toBe('1 season');
  expect(formatCount(3, { one: 'season', other: 'seasons' })).toBe('3 seasons');
  expect(formatCount(0, { one: 'vote', other: 'votes' })).toBe('0 votes');
});

test('formatCount groups large numbers', () => {
  expect(formatCount(1204, { one: 'vote', other: 'votes' })).toBe(
    '1,204 votes',
  );
});

test('formatDate formats a calendar date in UTC', () => {
  expect(formatDate('2024-03-12')).toBe('March 12, 2024');
});

test('formatDate has nothing to say about a date TMDB does not have', () => {
  expect(formatDate('')).toBe(null);
});

test('formatTally names both numbers while more were found than shown', () => {
  expect(formatTally(20, 1204, { one: 'show', other: 'shows' })).toBe(
    'the top 20 of 1,204 shows',
  );
});

test('formatTally drops the "top" once the list holds everything', () => {
  expect(formatTally(6, 6, { one: 'show', other: 'shows' })).toBe('6 shows');
  expect(formatTally(1, 1, { one: 'movie', other: 'movies' })).toBe('1 movie');
});

// The search page never asks this: it returns before the tally when both Kinds
// came back empty. `formatTally` is exported all the same, and zero is an
// ordinary total for it the way it is for `formatCount` above, so the contract
// is pinned here rather than left for the next caller to find in production.
test('formatTally counts a total of zero, whatever its callers guard', () => {
  expect(formatTally(0, 0, { one: 'show', other: 'shows' })).toBe('0 shows');
});

test('formatNumber groups a large number and leaves a small one alone', () => {
  expect(formatNumber(1204)).toBe('1,204');
  expect(formatNumber(7)).toBe('7');
  expect(formatNumber(0)).toBe('0');
});
