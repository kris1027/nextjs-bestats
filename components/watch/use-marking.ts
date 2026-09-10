'use client';

import {
  type MouseEvent,
  startTransition,
  useOptimistic,
  useState,
} from 'react';

import { useAddress } from '@/lib/use-address';
import {
  MARKING_FIELD,
  type Marking,
  marked,
  markingsAgree,
  markingValue,
} from '@/lib/watch';
import { mark } from '@/lib/watch-actions';

/** What a marking control needs to draw itself and to answer a press. */
type MarkingHandle = {
  /** The address to come back to, for the form's `next` field. */
  next: string;
  /** What to draw as marked: the optimistic value while a press is in flight. */
  shown: Marking | null;
  /** The last press's message, or `null`. */
  error: string | null;
  /** The `onClick` a button pressing `pressed` wears. */
  press: (pressed: Marking) => (event: MouseEvent<HTMLButtonElement>) => void;
};

/**
 * Everything a marking control does that is not markup: the optimistic
 * marking, the press that calls the action, and the message a refused press
 * leaves. A hook rather than a component because there are two controls with
 * one rule between them — the card's, which shows a Score and cannot set one,
 * and the detail page's, which is the only place ten stars fit.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 *
 * `marked` in `lib/watch` is the whole rule, and it runs here for the
 * optimistic flip and again in the action against the row as it really is.
 *
 * Which is why every caller keys its control on the Viewer. The state below
 * outlives a re-render at the same tree position, and signing out is exactly
 * that: the action redirects to `/`, and a Viewer already there gets a soft
 * navigation rather than a remount. The server sends an empty lookup and
 * every marking arrives `null`, but a component that only reads its prop at
 * mount never sees it, and a Visitor is left reading a Viewer's Watch
 * Records. The key is what unmounts them. — `viewerKey` in `lib/auth`.
 */
const useMarking = (initial: Marking | null): MarkingHandle => {
  const next = useAddress();

  // the marking as the last completed action left it, and the prop it was
  // seeded from, which is what the reset below compares against
  const [seed, setSeed] = useState(initial);
  const [marking, setMarking] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  // `marked` is the reducer, so a press flips from whatever is shown — a
  // second press while the first is in flight unmarks on screen the way it
  // will on the server — and the value falls back to `marking` on its own
  // when the actions settle, which is how a failed write undoes the flip
  const [shown, flip] = useOptimistic(marking, marked);

  // The server has said something new about this piece of Media since the
  // marking above was seeded, so its word replaces what a press left here.
  // The key handles a Viewer who changed; this handles a Viewer who did not —
  // a navigation that re-renders this control rather than remounting it,
  // which is every navigation with the same piece of Media in both renders,
  // since that is what a card is keyed on: a new `q=` on search matching a
  // piece of Media the last Query matched, or a turn of a list page that a
  // marking has reordered. That render's lookup ran after the marking reached
  // the database, so it is the newer of the two and this is not a revert.
  //
  // By value: a marking is an object now, so two renders saying the same
  // thing are two objects, and identity here would reset on every render.
  //
  // Back is the one place it can be the older of the two: Next's default
  // `staleTimes.dynamic` of 0 — which `next.config.ts` leaves alone rather
  // than sets — is why a forward navigation refetches, but back and forward
  // replay what was cached, which may predate the marking. The control then
  // un-lights a row that really is marked, until the next render says so
  // again. Accepted: that costs a moment of a wrong-looking button on a path
  // that marks something, a same-route navigation and a press of Back, where
  // holding the old marking costs a stale one on every ordinary search and
  // page turn.
  if (!markingsAgree(seed, initial)) {
    setSeed(initial);
    setMarking(initial);
    setError(null);
  }

  const press =
    (pressed: Marking) =>
    (event: MouseEvent<HTMLButtonElement>): void => {
      const { form } = event.currentTarget;

      // a submit button always has one; let the browser have it otherwise
      if (!form) return;

      event.preventDefault();
      setError(null);

      // an async transition, which is what lets the optimistic value stand
      // until `mark` settles and then revert or be replaced
      startTransition(async () => {
        flip(pressed);

        // read off the form, so the fields the browser would post and the
        // fields this handler posts are the same markup; only the pressed
        // button is added, since the submitter is what a click supplies
        const formData = new FormData(form);
        formData.set(MARKING_FIELD, markingValue(pressed));

        // not wrapped in try/catch: a signed-out press makes `mark` redirect,
        // which reaches the client as a rejection the router's boundary handles
        const result = await mark(formData);

        if ('error' in result) {
          setError(result.error);
        } else {
          setMarking(result.marking);
        }
      });
    };

  return { next, shown, error, press };
};

export { useMarking };
