'use client';

import type { JSX, ReactNode } from 'react';

import type { MarkingHandle } from '@/components/watch/use-marking';
import { cn } from '@/lib/utils';

/**
 * The form every marking control posts: the hidden fields that never change
 * with the press — what it is about, and where to come back to — and the live
 * region a refused press writes to. What varies is the buttons, which are
 * `children`. It takes the whole handle, so the fields and the action it
 * posts are the ones the buttons press.
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
  handle,
  className,
  errorClassName,
  children,
}: {
  handle: MarkingHandle;
  className?: string;
  /** Where a refused press's sentence goes, for a form with no room below. */
  errorClassName?: string;
  children: ReactNode;
}): JSX.Element => (
  <form
    action={handle.target.post}
    className={cn('flex flex-col gap-1.5', className)}
  >
    {Object.entries(handle.target.fields).map(([name, value]) => (
      <input key={name} type='hidden' name={name} value={value} />
    ))}
    <input type='hidden' name='next' value={handle.next} />
    {children}
    {/* <output> is a live region on its own, kept in the tree even when
        empty so the message is announced when it arrives rather than
        needing focus to find it */}
    <output
      className={cn('block min-h-4 text-destructive text-xs', errorClassName)}
    >
      {handle.error}
    </output>
  </form>
);

export { MarkingForm };
