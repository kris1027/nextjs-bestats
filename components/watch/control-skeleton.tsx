import type { JSX } from 'react';

import type { Kind } from '@/lib/media';
import { takesScore } from '@/lib/watch';

/**
 * The detail page's marking control while the Watch Record behind it is being
 * read: the Planned button's height, the row of ten stars' where the Kind has
 * one, and the live region's, so the page is the same height before and after
 * the control lands. A Show's control has no stars, so neither does its
 * skeleton. A card's control, on `AbsentCard`, has no skeleton: it arrives with
 * the list that renders it.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 */
const MarkingControlSkeleton = ({ kind }: { kind: Kind }): JSX.Element => (
  <div className='flex flex-col gap-1.5' aria-hidden='true'>
    <div className='h-7 animate-pulse bg-muted' />
    {takesScore(kind) ? <div className='h-9 animate-pulse bg-muted' /> : null}
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

export { EpisodeScoreSkeleton, MarkingControlSkeleton };
