import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

import { Star } from 'lucide-react';

import type { Score } from '@/lib/watch';

/**
 * The top of a card: the poster and the title bar, with the one star-and-
 * number that bar holds. No directive of its own, so it stays server-rendered
 * in a card that has no control to draw and comes along into the client
 * subtree of one that does — which is what lets `MarkableCard` and a card
 * with an Unanswered lookup share this markup rather than keep two copies.
 */
const CardHead = ({
  label,
  poster,
  href,
  score,
  tmdbRating,
}: {
  label: string;
  poster: ReactNode;
  /** Absent on a card with nowhere to go, which is what `AbsentCard` is. */
  href?: string;
  /** The Viewer's Score, which takes the badge whenever there is one. */
  score: Score | null;
  /** What the badge shows until then. */
  tmdbRating?: { rating: number; voteCount: number };
}): JSX.Element => {
  const head = (
    <>
      {poster}
      <div className='flex items-center justify-between gap-2 bg-primary px-2.5 py-1.5 text-primary-foreground'>
        <h2
          className='min-w-0 truncate font-extrabold text-[13px] leading-[1.2]'
          title={label}
        >
          {label}
        </h2>
        {/* One star and one number, never two. A Viewer who has scored this
            sees their Score where TMDB's Rating was: two ten-point numbers a
            few pixels apart in a card this narrow is the confusion the
            glossary separates Rating from Score to avoid, and TMDB's is still
            on the detail page, where there is room to say which is which.
            Nobody has voted is no Rating at all — a 0.0 here would read as a
            score rather than as its absence. */}
        {score !== null ? (
          <Badge label={`Your Score: ${score} out of 10`}>{score}</Badge>
        ) : tmdbRating && tmdbRating.voteCount > 0 ? (
          <Badge
            label={`TMDB rating: ${tmdbRating.rating.toFixed(1)} out of 10`}
          >
            {tmdbRating.rating.toFixed(1)}
          </Badge>
        ) : null}
      </div>
    </>
  );

  if (!href) return head;

  return (
    <Link href={href} className='focus-visible:outline-hidden'>
      {head}
    </Link>
  );
};

/**
 * The one star-and-number a title bar holds. The label says which of the two
 * it is, since nothing about the number itself does.
 */
const Badge = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element => (
  <div
    className='flex shrink-0 items-center gap-1 whitespace-nowrap font-extrabold text-xs'
    title={label}
  >
    <Star size={12} className='fill-current' aria-hidden='true' />
    <p>
      <span className='sr-only'>{label}</span>
      <span aria-hidden='true'>{children}</span>
    </p>
  </div>
);

export { CardHead };
