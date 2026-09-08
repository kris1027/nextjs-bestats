import { expect, test } from 'vitest';

import type { ViewerAnswer } from '@/lib/auth';
import { viewerKey, viewerKeyOf } from '@/lib/viewer-key';

/**
 * The key a marking control is rendered under. It is the whole of what stops
 * a Viewer's Watch Records from staying lit on a Visitor's page after a sign
 * out, and a wrong one is silent: the control renders, it just holds state
 * that is no longer anyone's.
 *
 * No mock: `lib/viewer-key` imports `lib/auth` for types alone, so nothing
 * here loads Neon Auth's package or `next/headers`, and the module is a
 * plain import the way `lib/watch.ts` is.
 */

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
