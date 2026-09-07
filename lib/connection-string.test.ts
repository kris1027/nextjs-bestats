import { expect, test } from 'vitest';

import { databaseHost, withoutSecrets } from '@/lib/connection-string';

/**
 * What `db:check` may say about a database it could not read. These matter
 * more than most tests here: the failure they cover is the one that happens
 * while someone holds production's connection string in their shell.
 */

const URL_WITH_PASSWORD =
  'postgresql://neondb_owner:npg_S3cr3t@ep-soft-fog-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require';

test('databaseHost keeps the one part of a connection string worth printing', () => {
  expect(databaseHost(URL_WITH_PASSWORD)).toBe(
    'ep-soft-fog-pooler.eu-central-1.aws.neon.tech',
  );
});

test('databaseHost answers null for what is not a connection string', () => {
  // what an unsubstituted placeholder looks like, which is how this was found
  expect(databaseHost('<main pooled url>')).toBeNull();
  expect(databaseHost('')).toBeNull();
});

test("the driver's own message loses the string it quoted back", () => {
  // the shape `neon()` throws: the whole connection string, password included
  const thrown = `Database connection string provided to \`neon()\` is not a valid URL. Connection string: ${URL_WITH_PASSWORD}`;
  const safe = withoutSecrets(thrown, URL_WITH_PASSWORD);

  expect(safe).not.toContain('npg_S3cr3t');
  expect(safe).not.toContain(URL_WITH_PASSWORD);
  expect(safe).toContain('<connection string>');
});

test('a password quoted on its own is struck out too', () => {
  const safe = withoutSecrets(
    'password authentication failed for "npg_S3cr3t"',
    URL_WITH_PASSWORD,
  );

  expect(safe).not.toContain('npg_S3cr3t');
  expect(safe).toContain('<password>');
});

test('a percent-encoded password is struck out as it appears', () => {
  const encoded = 'postgresql://user:p%40ss%3Aword@host.neon.tech/db';

  expect(
    withoutSecrets('could not connect using p%40ss%3Aword', encoded),
  ).not.toContain('p%40ss%3Aword');
});

test('a string with no password leaves the rest of the message alone', () => {
  const message = withoutSecrets(
    'fetch failed',
    'postgresql://host.neon.tech/db',
  );

  expect(message).toBe('fetch failed');
});

test('what is not a URL is still struck out of the message', () => {
  expect(
    withoutSecrets('bad url: <main pooled url>', '<main pooled url>'),
  ).toBe('bad url: <connection string>');
});
