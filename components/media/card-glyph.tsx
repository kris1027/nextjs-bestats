import type { JSX } from 'react';

import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A mark a card draws over its poster. Each one is the legend's too, and both
 * draw it from here, so a card cannot wear a colour the legend explains as
 * something else.
 */
type Glyph = 'rating' | 'score';

const colours: Record<Glyph, string> = {
  rating: 'fill-rating text-rating',
  score: 'fill-score text-score',
};

/** Decorative: whatever carries it says in words what it means. */
const CardGlyph = ({
  glyph,
  className,
}: {
  glyph: Glyph;
  className?: string;
}): JSX.Element => (
  <Star aria-hidden='true' className={cn(colours[glyph], className)} />
);

export { CardGlyph, type Glyph };
