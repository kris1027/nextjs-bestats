import type { JSX } from 'react';

/**
 * A Movie's marking control while its Watch Record is read: the Planned
 * button's height, the row of ten stars', and the live region's, so the page
 * is the same height before and after the control lands. A card's control, on
 * `AbsentCard`, has no skeleton: it arrives with the list that renders it.
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
 * A Show's control while its record and its Episodes' are read: the one
 * button and the live region beneath it. The common case, since the fallback
 * cannot know which lands — a finished Show draws nothing in its place.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 */
const ShowControlSkeleton = (): JSX.Element => (
  <div className='flex flex-col gap-1.5' aria-hidden='true'>
    <div className='h-7 animate-pulse bg-muted' />
    <div className='min-h-4' />
  </div>
);

/**
 * An Episode page's control while its Watch Record is read: the row of ten
 * stars and the live region beneath it, which is the whole of that control.
 */
const EpisodeScoreSkeleton = (): JSX.Element => (
  <div className='flex flex-col gap-1.5' aria-hidden='true'>
    <div className='h-9 animate-pulse bg-muted' />
    <div className='min-h-4' />
  </div>
);

export { EpisodeScoreSkeleton, MarkingControlSkeleton, ShowControlSkeleton };
