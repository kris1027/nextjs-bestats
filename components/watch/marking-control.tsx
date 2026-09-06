'use client';

import {
  type JSX,
  type MouseEvent,
  startTransition,
  useOptimistic,
  useState,
} from 'react';

import { Bookmark, Check, type LucideIcon } from 'lucide-react';

import { useAddress } from '@/lib/use-address';
import { cn } from '@/lib/utils';
import {
  type MediaRef,
  marked,
  WATCH_STATES,
  type WatchState,
} from '@/lib/watch';
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
 */
const MarkingControl = ({
  media,
  state: initial,
}: {
  media: MediaRef;
  state: WatchState | null;
}): JSX.Element => {
  const next = useAddress();

  // the state as the last completed action left it; the prop only seeds it
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  // `marked` is the reducer, so a press flips from whatever is shown — a
  // second press while the first is in flight unmarks on screen the way it
  // will on the server — and the value falls back to `state` on its own when
  // the actions settle, which is how a failed write undoes the flip
  const [shown, flip] = useOptimistic(state, marked);

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
    <form action={markFromForm} className='flex flex-col gap-1.5'>
      <input type='hidden' name='kind' value={media.kind} />
      <input type='hidden' name='id' value={media.id} />
      <input type='hidden' name='next' value={next} />
      <div className='flex gap-1.5'>
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
