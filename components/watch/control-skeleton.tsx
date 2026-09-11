import type { JSX } from 'react';

/**
 * The detail page's marking control while the Watch Record behind it is being
 * read: the Planned button's height, the row of ten stars', and the live
 * region's, so the page is the same height before and after the control
 * lands. The only control skeleton in the repo, since the detail page is the
 * only place a control is waited for — a card's, on `AbsentCard`, arrives
 * with the list that renders it.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 */
const MarkingControlSkeleton = (): JSX.Element => (
  <div className='flex flex-col gap-1.5' aria-hidden='true'>
    <div className='h-7 animate-pulse bg-muted' />
    <div className='h-9 animate-pulse bg-muted' />
    <div className='min-h-4' />
  </div>
);

export { MarkingControlSkeleton };
