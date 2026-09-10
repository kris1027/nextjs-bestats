import type { JSX } from 'react';

/**
 * The detail page's marking control while the Watch Record behind it is being
 * read: the Planned button's height, the row of ten stars', and the live
 * region's, so the page is the same height before and after the control
 * lands. Its own skeleton rather than the card's, because the two controls
 * are two shapes — this is the only one with stars in it.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 */
const MarkingControlSkeleton = (): JSX.Element => (
  <div className='flex flex-col gap-1.5' aria-hidden='true'>
    <div className='h-7 animate-pulse bg-muted' />
    <div className='h-9 animate-pulse bg-muted' />
    <div className='min-h-4' />
  </div>
);

/**
 * A card's control while the same read is in flight: one Planned button and
 * the live region under it. A card cannot score, so there is no star row to
 * hold room for.
 */
const CardControlSkeleton = (): JSX.Element => (
  <div className='flex flex-col gap-1.5' aria-hidden='true'>
    <div className='h-7 animate-pulse bg-muted' />
    <div className='min-h-4' />
  </div>
);

export { CardControlSkeleton, MarkingControlSkeleton };
