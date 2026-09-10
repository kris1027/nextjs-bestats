'use client';

import type { JSX, ReactNode } from 'react';

import type { MediaRef } from '@/lib/media';
import { cn } from '@/lib/utils';
import { markFromForm } from '@/lib/watch-actions';

/**
 * The form both marking controls post: the three fields that never change
 * with the press, and the live region a refused press writes to. What varies
 * is the buttons, which are `children`.
 *
 * The `action` is a Server Action and the buttons inside are plain named
 * submit buttons, so the HTML posts on its own before hydration and React
 * fills in the fields that name the action. Once hydrated, each button's
 * `onClick` from `useMarking` takes over — the same shape as `next/form` and
 * `BackButton`. Not a client `formAction` on the button: React strips a
 * button's `name` and blocks it before hydration when its `formAction` is a
 * client function, which is both halves lost at once.
 *
 * Nothing refreshes on success. What the action returns is what the row now
 * holds, no page shows a piece of Media twice, and Next refetches a dynamic
 * page on the next navigation to it.
 */
const MarkingForm = ({
  media,
  next,
  error,
  className,
  children,
}: {
  media: MediaRef;
  next: string;
  error: string | null;
  className?: string;
  children: ReactNode;
}): JSX.Element => (
  <form
    action={markFromForm}
    className={cn('flex flex-col gap-1.5', className)}
  >
    <input type='hidden' name='kind' value={media.kind} />
    <input type='hidden' name='id' value={media.id} />
    <input type='hidden' name='next' value={next} />
    {children}
    {/* <output> is a live region on its own, kept in the tree even when
        empty so the message is announced when it arrives rather than
        needing focus to find it */}
    <output className='block min-h-4 text-destructive text-xs'>{error}</output>
  </form>
);

export { MarkingForm };
