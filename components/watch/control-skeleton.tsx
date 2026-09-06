import type { JSX } from 'react';

/**
 * The marking control's shape while the Watch Record behind it is being
 * read: two button-sized blocks and the live region's height, so a card or
 * a detail page is the same height before and after the control lands.
 */
const MarkingControlSkeleton = (): JSX.Element => (
  <div className='flex flex-col gap-1.5' aria-hidden='true'>
    <div className='flex gap-1.5'>
      <div className='h-7 flex-1 animate-pulse bg-muted' />
      <div className='h-7 flex-1 animate-pulse bg-muted' />
    </div>
    <div className='min-h-4' />
  </div>
);

export { MarkingControlSkeleton };
