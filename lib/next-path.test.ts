import { expect, test } from 'vitest';

import { address, nextPath, signInAddress } from '@/lib/next-path';

test('nextPath keeps a same-origin path', () => {
  expect(nextPath('/tv/1399')).toBe('/tv/1399');
  expect(nextPath('/search?q=dune&kind=movie')).toBe(
    '/search?q=dune&kind=movie',
  );
});

test('nextPath sends a missing or empty parameter home', () => {
  expect(nextPath(undefined)).toBe('/');
  expect(nextPath('')).toBe('/');
});

test('nextPath refuses an absolute URL', () => {
  expect(nextPath('https://elsewhere.example/tv/1399')).toBe('/');
  expect(nextPath('http://elsewhere.example')).toBe('/');
});

// the case a startsWith('/') check waves through
test('nextPath refuses a protocol-relative path', () => {
  expect(nextPath('//elsewhere.example')).toBe('/');
  expect(nextPath('//elsewhere.example/tv/1399')).toBe('/');
});

// browsers fold the backslash to a slash, making this the case above in disguise
test('nextPath refuses a backslash after the leading slash', () => {
  expect(nextPath('/\\elsewhere.example')).toBe('/');
});

// stripped before the value is resolved, so they can hide any of the above
test('nextPath refuses whitespace and control characters', () => {
  expect(nextPath(' //elsewhere.example')).toBe('/');
  expect(nextPath('/\telsewhere')).toBe('/');
  expect(nextPath('/\nelsewhere')).toBe('/');
});

test('nextPath takes the first of a repeated parameter', () => {
  expect(nextPath(['/tv/1399', '/movie/603'])).toBe('/tv/1399');
  expect(nextPath(['//elsewhere.example', '/tv/1399'])).toBe('/');
});

test('address is the pathname alone when there is no query string', () => {
  expect(address('/', '')).toBe('/');
  expect(address('/tv/1399', '')).toBe('/tv/1399');
});

test('address keeps the query string', () => {
  expect(address('/search', 'q=dune&kind=movie')).toBe(
    '/search?q=dune&kind=movie',
  );
});

test('what address builds, nextPath honours', () => {
  const here = address('/search', 'q=dune&kind=movie');

  expect(nextPath(here)).toBe(here);
});

test('what signInAddress sends, nextPath brings back', () => {
  expect(signInAddress('/watchlist?page=2')).toBe(
    '/sign-in?next=%2Fwatchlist%3Fpage%3D2',
  );
  expect(nextPath(decodeURIComponent('%2Fwatchlist%3Fpage%3D2'))).toBe(
    '/watchlist?page=2',
  );
});
