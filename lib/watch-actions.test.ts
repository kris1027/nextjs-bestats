import { afterEach, expect, test, vi } from 'vitest';

import { mark } from '@/lib/watch-actions';

/**
 * What `mark` does when the database refuses, which is the one branch
 * `lib/watch-actions.integration.test.ts` cannot reach: it runs against a
 * branch CI has just migrated, where the queries work.
 *
 * Production spent weeks in this branch. `marking_tallies` had never been
 * created there, so `tallyMarking` threw `42P01` on every press and the
 * Viewer was told to try again in a moment. These tests pin the two halves
 * that mattered: the Visitor gets a sentence rather than a stack trace, and
 * the cause reaches the server log, which is where the answer turned out to
 * be.
 * — `docs/adr/0009-every-environment-is-a-neon-branch.md`
 *
 * A unit test because mocking the queries is also what keeps `lib/db` — whose
 * import throws without `DATABASE_URL` — out of the module graph, so this
 * runs on a commit and in CI's first job.
 */

const queries = vi.hoisted(() => ({
  tallyMarking: vi.fn(),
  watchLookup: vi.fn(),
  writeWatchRecord: vi.fn(),
  clearWatchRecord: vi.fn(),
}));

vi.mock('@/lib/watch-queries', () => queries);

// the same stand-in the integration file uses: `mark` reads the Viewer from
// the session and from nowhere else
vi.mock('@/lib/auth', () => ({
  answeredViewer: async () => ({
    answer: 'viewer',
    viewer: { id: 'a-viewer', name: 'Action Viewer', image: null },
  }),
}));

/** What the marking control posts. */
const press = (): FormData => {
  const formData = new FormData();

  formData.set('kind', 'tv');
  formData.set('id', '236235');
  formData.set('state', 'planned');
  formData.set('next', '/tv/236235');

  return formData;
};

/** The error production actually raised, as the driver hands it over. */
const missingTable = Object.assign(
  new Error('relation "marking_tallies" does not exist'),
  { code: '42P01' },
);

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

test('a query that throws reaches the Viewer as a sentence, not a throw', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  queries.tallyMarking.mockRejectedValue(missingTable);

  expect(await mark(press())).toEqual({
    error: 'Could not mark that. Try again in a moment.',
  });
});

test('the cause reaches the log, naming the Media the press was for', async () => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  queries.tallyMarking.mockRejectedValue(missingTable);

  await mark(press());

  // `tv/236235` is what made the production log searchable, and the cause is
  // the whole diagnosis — neither may be swallowed with the message
  expect(logged).toHaveBeenCalledWith(
    'Marking tv/236235 failed:',
    missingTable,
  );
});

test('a write that throws after the reads succeed is reported the same way', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  queries.tallyMarking.mockResolvedValue(1);
  queries.watchLookup.mockResolvedValue(new Map());
  queries.writeWatchRecord.mockRejectedValue(new Error('the write failed'));

  expect(await mark(press())).toEqual({
    error: 'Could not mark that. Try again in a moment.',
  });
});

test('the press is counted before anything is read or written', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  queries.tallyMarking.mockRejectedValue(missingTable);

  await mark(press());

  // the guard runs first on purpose, so a refused press costs one statement.
  // The cost is that its own table going missing takes marking with it, which
  // is exactly what happened — failing open would be worse, so this stands.
  expect(queries.tallyMarking).toHaveBeenCalledWith('a-viewer');
  expect(queries.watchLookup).not.toHaveBeenCalled();
  expect(queries.writeWatchRecord).not.toHaveBeenCalled();
});
