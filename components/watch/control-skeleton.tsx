import type { JSX } from 'react';

/**
 * The marking control's shape while the Watch Record behind it is being
 * read: two button-sized blocks and the live region's height, so a card or
 * a detail page is the same height before and after the control lands.
 *
 * The container query is the control's, mirrored. It is what decides whether
 * those blocks sit in one row or two, so a copy that stacks at a different
 * width is a card that changes height when the real control lands — the one
 * thing this component exists to prevent. Change the one, change the other.
 */
const MarkingControlSkeleton = (): JSX.Element => (
  <div className='@container flex flex-col gap-1.5' aria-hidden='true'>
    <div className='flex flex-col gap-1.5 @min-[200px]:flex-row'>
      <div className='h-7 flex-1 animate-pulse bg-muted' />
      <div className='h-7 flex-1 animate-pulse bg-muted' />
    </div>
    <div className='min-h-4' />
  </div>
);

export { MarkingControlSkeleton };
