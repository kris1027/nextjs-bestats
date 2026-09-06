import { expect, test } from 'vitest';

import { firstValue, pageNumber } from '@/lib/search-params';

test('firstValue takes the first of a repeated parameter and nothing of none', () => {
  expect(firstValue('a')).toBe('a');
  expect(firstValue(['a', 'b'])).toBe('a');
  expect(firstValue(undefined)).toBe('');
  expect(firstValue([])).toBe('');
});

test('pageNumber reads a whole number from 1 up', () => {
  expect(pageNumber('1')).toBe(1);
  expect(pageNumber('2')).toBe(2);
  expect(pageNumber('11')).toBe(11);
});

test('pageNumber is 1 when the parameter is absent', () => {
  expect(pageNumber(undefined)).toBe(1);
  expect(pageNumber('')).toBe(1);
});

// a typo, not an address: it falls through rather than failing
test('pageNumber is 1 for anything that is not a page', () => {
  expect(pageNumber('0')).toBe(1);
  expect(pageNumber('-1')).toBe(1);
  expect(pageNumber('abc')).toBe(1);
  expect(pageNumber('2.5')).toBe(1);
  expect(pageNumber('02')).toBe(1);
  expect(pageNumber(' 2')).toBe(1);
  expect(pageNumber('1e3')).toBe(1);
});

test('pageNumber takes the first of a repeated parameter', () => {
  expect(pageNumber(['3', '4'])).toBe(3);
});
