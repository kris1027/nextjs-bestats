import type { Viewer, ViewerAnswer } from '@/lib/auth';

/**
 * The key a marking control is rendered under. Pure, and deliberately not in
 * `lib/auth.ts`: that module creates Neon Auth's instance at import and reads
 * `next/headers`, so nothing Next does not bundle can load it — and the key
 * is a string built from an id, which needs neither. `lib/watch-queries.ts`
 * reaches for it, and a query that had to boot a session to spell a key
 * would take every test of the queries with it. The same split as
 * `lib/watch.ts` beside `lib/watch-queries.ts`, one module over.
 *
 * The types come from `lib/auth`, which owns them; a type import is erased,
 * so it costs this module nothing at runtime.
 */

/** The key every request with no Viewer behind it shares. */
const NO_VIEWER = 'visitor';

/**
 * The key a marking control is rendered under, which is the whole of what a
 * caller needs: a control keyed on this unmounts when the Viewer changes,
 * and that is what keeps a Viewer's Watch Records from staying lit on a
 * Visitor's page after a sign out. The state a control holds outlives a
 * re-render at the same position; it does not outlive an unmount.
 *
 * The finished key rather than the id it is built from, so no call site
 * spells the Visitor's half for itself: one that spells it differently keys
 * two Visitors apart for nothing, and one that leaves it off hands React
 * `undefined`, which is no key at all and no type error either. The prefix
 * is what keeps a Viewer whose id is `visitor` from sharing a key with every
 * Visitor there is.
 */
export const viewerKey = (viewer: Pick<Viewer, 'id'>): string =>
  `viewer:${viewer.id}`;

/**
 * The same key from an answer that may be Unanswered, for the callers that
 * ask with `answeredViewer`. An Unanswered sign-in takes the Visitor's key
 * and never reaches a control — a card and the detail page both render none
 * when the lookup came back `null` — so the two are not told apart here.
 */
export const viewerKeyOf = (asked: ViewerAnswer): string =>
  asked.answer === 'viewer' ? viewerKey(asked.viewer) : NO_VIEWER;
