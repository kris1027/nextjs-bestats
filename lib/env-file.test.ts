import { expect, test } from 'vitest';

import { envValue, withEnvValue } from '@/lib/env-file';

const EXAMPLE = `# Get a read access token
TMDB_API_TOKEN=
TMDB_API_URL=https://api.themoviedb.org/3

# The one Neon does not supply
NEON_AUTH_COOKIE_SECRET=
`;

test('envValue reads an assigned value', () => {
  expect(envValue(EXAMPLE, 'TMDB_API_URL')).toBe(
    'https://api.themoviedb.org/3',
  );
});

test("envValue answers null for the example's blanks and for what is absent", () => {
  expect(envValue(EXAMPLE, 'TMDB_API_TOKEN')).toBeNull();
  expect(envValue(EXAMPLE, 'DATABASE_URL')).toBeNull();
});

test('envValue does not read one key as the end of another', () => {
  expect(envValue('NOT_TMDB_API_URL=x\n', 'TMDB_API_URL')).toBeNull();
});

test('withEnvValue fills a blank in place and touches nothing else', () => {
  const filled = withEnvValue(EXAMPLE, 'NEON_AUTH_COOKIE_SECRET', 'abc=');

  expect(filled).toBe(
    EXAMPLE.replace('NEON_AUTH_COOKIE_SECRET=', 'NEON_AUTH_COOKIE_SECRET=abc='),
  );
});

test('withEnvValue adds a missing key on a line of its own', () => {
  expect(withEnvValue('A=1', 'B', '2')).toBe('A=1\nB=2\n');
  expect(withEnvValue('', 'B', '2')).toBe('B=2\n');
});

test('withEnvValue writes a $ in the value literally', () => {
  expect(withEnvValue('KEY=\n', 'KEY', "a$&b$'")).toBe("KEY=a$&b$'\n");
});
