import assert from 'node:assert/strict';
import { test } from 'node:test';

// Node strips the types itself and does not read tsconfig `paths`, so this
// import is relative and carries its extension.
import { formatAirDate, formatCount, formatRuntime } from './format.ts';

test('formatRuntime splits minutes into hours and minutes', () => {
  assert.equal(formatRuntime(134), '2h 14m');
});

test('formatRuntime drops the minutes on an exact hour', () => {
  assert.equal(formatRuntime(120), '2h');
});

test('formatRuntime drops the hours under an hour', () => {
  assert.equal(formatRuntime(45), '45m');
});

test('formatRuntime has nothing to say about an unknown runtime', () => {
  assert.equal(formatRuntime(null), null);
  assert.equal(formatRuntime(0), null);
});

test('formatCount picks the plural form by count', () => {
  assert.equal(formatCount(1, { one: 'season', other: 'seasons' }), '1 season');
  assert.equal(
    formatCount(3, { one: 'season', other: 'seasons' }),
    '3 seasons',
  );
  assert.equal(formatCount(0, { one: 'vote', other: 'votes' }), '0 votes');
});

test('formatCount groups large numbers', () => {
  assert.equal(
    formatCount(1204, { one: 'vote', other: 'votes' }),
    '1,204 votes',
  );
});

test('formatAirDate formats a calendar date in UTC', () => {
  assert.equal(formatAirDate('2024-03-12'), 'March 12, 2024');
});

test('formatAirDate has nothing to say about an unaired title', () => {
  assert.equal(formatAirDate(''), null);
});
