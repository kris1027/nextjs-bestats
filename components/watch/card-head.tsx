import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

import { PosterFrame } from '@/components/media/poster-frame';
import { StarBadge } from '@/components/media/star-badge';
import type { Rating } from '@/lib/media';
import type { Score } from '@/lib/watch';

/**
 * Everything the head shows that is not the Viewer's own. `AbsentCard` builds
 * one and both of its branches read it, and `MarkableCard` passes it through
 * untouched rather than taking the four apart and putting them back.
 */
type CardHeadContent = {
  label: string;
  poster: ReactNode;
  /** Absent on a card with nowhere to go, which is what `AbsentCard` is. */
  href?: string;
  /** What the badge shows until the Viewer has scored this. */
  tmdbRating?: Rating;
  /**
   * A line under the title bar, inside the link, so a screen reader hears it
   * as part of where the card goes: `S2E4`, announced as "Next episode".
   */
  detail?: { label: string; text: string };
};

/**
 * The top of a card: the poster in its rounded frame, the one star-and-number
 * over it, and the title under it. No directive of its own, so it stays
 * server-rendered in a card that has no control to draw and comes along into
 * the client subtree of one that does — which is what lets `MediaCard`, which
 * has no control at all, and `MarkableCard`, which has one, share this markup
 * rather than keep two copies of it.
 *
 * The title is one line, cut short with its whole self in `title`, so every
 * card in a row is one height and `MediaCardSkeleton` can hold it exactly.
 */
const CardHead = ({
  label,
  poster,
  href,
  score,
  tmdbRating,
  detail,
}: CardHeadContent & {
  /** The Viewer's Score, which takes the badge whenever there is one. */
  score: Score | null;
}): JSX.Element => {
  const head = (
    <>
      <PosterFrame poster={poster}>
        <StarBadge score={score} tmdbRating={tmdbRating} />
      </PosterFrame>
      <h2
        className='mt-2 truncate font-medium text-sm leading-[1.3] sm:text-[15px]'
        title={label}
      >
        {label}
      </h2>
      {detail ? (
        <p className='pt-1 text-muted-foreground text-xs'>
          <span className='sr-only'>{detail.label}: </span>
          {detail.text}
        </p>
      ) : null}
    </>
  );

  if (!href) return head;

  return (
    <Link href={href} className='focus-visible:outline-hidden'>
      {head}
    </Link>
  );
};

export { CardHead };
export type { CardHeadContent };
