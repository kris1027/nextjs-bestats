import type { JSX } from 'react';

import { CardGlyph } from '@/components/media/card-glyph';
import { OverlayBadge } from '@/components/media/overlay-badge';
import type { Rating } from '@/lib/media';
import type { Score } from '@/lib/watch';

/**
 * The one star and one number a card holds, in its poster's top corner. Never
 * two: a Viewer who has scored this sees their Score, in its own colour, where
 * TMDB's Rating was. Two ten-point numbers a few pixels apart on a card this
 * narrow is the confusion the glossary separates Rating from Score to avoid,
 * and TMDB's is still on the detail page, where there is room to say which is
 * which. Nobody has voted is no Rating at all — a 0.0 here would read as a
 * score rather than as its absence — so that draws nothing.
 *
 * The label says which of the two it is, since nothing about the number
 * itself does; the eye has the colour, and a screen reader has the words.
 */
const StarBadge = ({
  score,
  tmdbRating,
}: {
  score: Score | null;
  tmdbRating?: Rating;
}): JSX.Element | null => {
  const shown =
    score !== null
      ? {
          glyph: 'score' as const,
          label: `Your Score: ${score} out of 10`,
          text: String(score),
        }
      : tmdbRating && tmdbRating.voteCount > 0
        ? {
            glyph: 'rating' as const,
            label: `TMDB rating: ${tmdbRating.rating.toFixed(1)} out of 10`,
            text: tmdbRating.rating.toFixed(1),
          }
        : null;

  if (!shown) return null;

  return (
    <OverlayBadge
      tone={shown.glyph === 'score' ? 'score' : 'neutral'}
      className='top-2 right-2 sm:top-2.75 sm:right-2.75'
    >
      <CardGlyph glyph={shown.glyph} />
      <span className='sr-only'>{shown.label}</span>
      <span aria-hidden='true'>{shown.text}</span>
    </OverlayBadge>
  );
};

export { StarBadge };
