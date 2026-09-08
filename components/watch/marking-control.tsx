'use client';

import {
  type JSX,
  type MouseEvent,
  startTransition,
  useOptimistic,
  useState,
} from 'react';

import { Bookmark, Check, type LucideIcon } from 'lucide-react';

import type { MediaRef } from '@/lib/media';
import { useAddress } from '@/lib/use-address';
import { cn } from '@/lib/utils';
import { marked, WATCH_STATES, type WatchState } from '@/lib/watch';
import { mark, markFromForm } from '@/lib/watch-actions';

/** The word and the icon each button wears: the glossary's two states. */
const BUTTONS: Record<WatchState, { label: string; Icon: LucideIcon }> = {
  planned: { label: 'Planned', Icon: Bookmark },
  watched: { label: 'Watched', Icon: Check },
};

/**
 * The two marking controls a piece of Media carries, Planned and Watched, as
 * one form with two submit buttons. Pressing the one the Watch Record is in
 * unmarks it — `marked` in `lib/watch` is the whole rule, and it runs here for
 * the optimistic flip and again in the action against the row as it really is.
 *
 * Rendered for every Visitor, signed in or not: a signed-out press leaves
 * through `/sign-in?next=` and comes back to this page, where they press
 * again. Nothing is replayed for them, and the control does not know which
 * it is rendering for — the flip before the redirect is the price of one
 * rendering path.
 *
 * The form's `action` is a Server Action and the buttons are plain named
 * submit buttons, so the HTML posts on its own before hydration and React
 * fills in the fields that name the action. Once hydrated, each button's
 * `onClick` takes over — the same shape as `next/form` and `BackButton`: it
 * stops the submit, flips first, calls the same action with the same four
 * fields, and keeps what comes back. Not a client `formAction` on the
 * button: React strips a button's `name` and blocks it before hydration when
 * its `formAction` is a client function, which is both halves lost at once.
 *
 * Nothing refreshes on success. The returned state is what the row now holds,
 * no page shows a piece of Media twice, and Next refetches a dynamic page on
 * the next navigation to it.
 *
 * Which is why the caller keys this on the Viewer. The state below outlives a
 * re-render at the same tree position, and signing out is exactly that: the
 * action redirects to `/`, and a Viewer already there gets a soft navigation
 * rather than a remount. The server sends an empty lookup and every `state`
 * arrives `null`, but a component that only reads its prop at mount never
 * sees it, and a Visitor is left reading a Viewer's Watch Records. The key
 * is what unmounts them. — `viewerKey` in `lib/auth`.
 */
const MarkingControl = ({
  media,
  state: initial,
}: {
  media: MediaRef;
  state: WatchState | null;
}): JSX.Element => {
  const next = useAddress();

  // the state as the last completed action left it, and the prop that state
  // was seeded from, which is what the reset below compares against
  const [seed, setSeed] = useState(initial);
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  // `marked` is the reducer, so a press flips from whatever is shown — a
  // second press while the first is in flight unmarks on screen the way it
  // will on the server — and the value falls back to `state` on its own when
  // the actions settle, which is how a failed write undoes the flip
  const [shown, flip] = useOptimistic(state, marked);

  // The server has said something new about this piece of Media since the
  // state above was seeded, so its word replaces what a press left here. The
  // key handles a Viewer who changed; this handles a Viewer who did not — a
  // navigation that re-renders this control rather than remounting it, which
  // is every navigation with the same piece of Media in both renders, since
  // that is what a card is keyed on: a new `q=` on search matching a piece
  // of Media the last Query matched, or a turn of a list page that a marking
  // has reordered. That render's lookup ran after the marking reached the
  // database, so it is the newer of the two and this is not a revert.
  //
  // Back is the one place it can be the older of the two: Next's default
  // `staleTimes.dynamic` of 0 — which `next.config.ts` leaves alone rather
  // than sets — is why a forward navigation refetches, but back and forward
  // replay what was cached, which may predate the marking. The control then
  // un-lights a row that really is marked, until the next render says so
  // again. Accepted: that costs a moment of a wrong-looking button on a path
  // that marks something, a same-route navigation and a press of Back, where
  // holding the old state costs a stale one on every ordinary search and
  // page turn.
  if (seed !== initial) {
    setSeed(initial);
    setState(initial);
    setError(null);
  }

  const press =
    (pressed: WatchState) =>
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
        formData.set('state', pressed);

        // not wrapped in try/catch: a signed-out press makes `mark` redirect,
        // which reaches the client as a rejection the router's boundary handles
        const result = await mark(formData);

        if ('error' in result) {
          setError(result.error);
        } else {
          setState(result.state);
        }
      });
    };

  return (
    <form action={markFromForm} className='@container flex flex-col gap-1.5'>
      <input type='hidden' name='kind' value={media.kind} />
      <input type='hidden' name='id' value={media.id} />
      <input type='hidden' name='next' value={next} />
      {/* Stacked until the two buttons fit beside each other, and the width
          asked about is this form's rather than the viewport's. What crowds
          these buttons is whatever holds them: a card in a grid is 151px at
          any viewport that draws two columns, and the detail page's slot is
          320px at every viewport there is. A `sm:` here would split the
          detail page's control in two on a phone that had room for it. */}
      <div className='flex flex-col gap-1.5 @min-[200px]:flex-row'>
        {WATCH_STATES.map((value) => {
          const { label, Icon } = BUTTONS[value];
          const pressed = shown === value;

          return (
            <button
              key={value}
              type='submit'
              name='state'
              value={value}
              onClick={press(value)}
              aria-pressed={pressed}
              className={cn(
                'inline-flex flex-1 items-center justify-center gap-1.5 border border-foreground/40 px-2.5 py-1.5 font-extrabold text-foreground text-xs leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14',
                pressed &&
                  'border-primary bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75',
              )}
            >
              <Icon size={14} className={cn(pressed && 'fill-current')} />
              {label}
            </button>
          );
        })}
      </div>
      {/* <output> is a live region on its own, kept in the tree even when
          empty so the message is announced when it arrives rather than
          needing focus to find it */}
      <output className='block min-h-4 text-destructive text-xs'>
        {error}
      </output>
    </form>
  );
};

export { MarkingControl };
