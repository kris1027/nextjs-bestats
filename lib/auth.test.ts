import { expect, test, vi } from 'vitest';

import { type ViewerAnswer, viewerKey, viewerKeyOf } from '@/lib/auth';

/**
 * The key a marking control is rendered under. It is the whole of what stops
 * a Viewer's Watch Records from staying lit on a Visitor's page after a sign
 * out, and a wrong one is silent: the control renders, it just holds state
 * that is no longer anyone's.
 *
 * A unit test, which means mocking Neon's package: `@neondatabase/auth`
 * reaches `next/headers` through an ESM build only Next's bundler resolves,
 * so importing `lib/auth` unmocked fails before a single assertion. `auth`
 * itself is never called here — the mock exists to let the module load, the
 * way `lib/watch-actions.test.ts` mocks the queries to keep `lib/db` out of
 * its graph.
 */
vi.mock('@neondatabase/auth/next/server', () => ({
  createNeonAuth: () => ({ getSession: vi.fn() }),
}));

const asViewer = (id: string): ViewerAnswer => ({
  answer: 'viewer',
  viewer: { id, name: 'A Viewer', image: null },
});

test('two Viewers never share a key', () => {
  expect(viewerKey({ id: 'one' })).not.toBe(viewerKey({ id: 'two' }));
});

test('a Viewer keys the same however they were asked for', () => {
  expect(viewerKeyOf(asViewer('one'))).toBe(viewerKey({ id: 'one' }));
});

test('signing out changes the key, which is what unmounts the control', () => {
  expect(viewerKeyOf(asViewer('one'))).not.toBe(
    viewerKeyOf({ answer: 'visitor' }),
  );
});

// the collision the bare id allowed: a Viewer with this id and every Visitor
// keyed alike, so signing out left that Viewer's states lit
test('a Viewer whose id is the Visitor key does not take it', () => {
  expect(viewerKey({ id: 'visitor' })).not.toBe(
    viewerKeyOf({ answer: 'visitor' }),
  );
});

// Unanswered never reaches a control — the lookup is `null` and no control is
// rendered — so it needs no key of its own, and takes the Visitor's
test('a Visitor and an Unanswered sign-in share one key', () => {
  expect(viewerKeyOf({ answer: 'unanswered' })).toBe(
    viewerKeyOf({ answer: 'visitor' }),
  );
});
