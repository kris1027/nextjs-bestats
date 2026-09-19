import type { ComponentType, JSX } from 'react';

import { CalendarDays, Star, Tv } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A mark a card draws over its poster. Each one is the legend's too, and both
 * draw it from here, so a card cannot wear a colour the legend explains as
 * something else.
 */
type Glyph = 'rating' | 'score' | 'planned' | 'episode' | 'date';

const colours: Record<Glyph, string> = {
  rating: 'fill-rating text-rating',
  score: 'fill-score text-score',
  planned: '',
  episode: 'text-muted-foreground',
  date: 'text-muted-foreground',
};

/**
 * The design's bookmark, filled and ticked. Lucide's `BookmarkCheck` is an
 * outline, which at 14px over a poster reads as the empty state rather than
 * the marked one.
 */
const PlannedIcon = ({ className }: { className?: string }): JSX.Element => (
  <svg viewBox='0 0 24 24' aria-hidden='true' className={className}>
    <path
      d='M6.5 3h11a1 1 0 011 1v17.2l-6.5-3.8-6.5 3.8V4a1 1 0 011-1z'
      className='fill-planned'
    />
    <path
      d='M9 10.6l2.1 2.1 3.9-4'
      fill='none'
      strokeWidth='2.2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='stroke-planned-foreground'
    />
  </svg>
);

const icons: Record<Glyph, ComponentType<{ className?: string }>> = {
  rating: Star,
  score: Star,
  planned: PlannedIcon,
  episode: Tv,
  date: CalendarDays,
};

/** Decorative: whatever carries it says in words what it means. */
const CardGlyph = ({
  glyph,
  className,
}: {
  glyph: Glyph;
  className?: string;
}): JSX.Element => {
  const Icon = icons[glyph];

  // lucide's icons hide themselves from a screen reader by default, and
  // `PlannedIcon` says so of itself
  return <Icon className={cn(colours[glyph], className)} />;
};

export { CardGlyph, type Glyph };
