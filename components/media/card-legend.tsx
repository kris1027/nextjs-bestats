import type { JSX } from 'react';

import { CardGlyph, type Glyph } from '@/components/media/card-glyph';

/** What each mark is called, in the glossary's words: a Score is never a rating. */
const WORDS: Record<Glyph, string> = {
  rating: 'TMDB rating',
  score: 'Your Score',
  planned: 'Planned',
  episode: 'Next episode',
  date: "When it's out",
};

/**
 * Which marks a page's cards can wear. Trending and search draw no lead, so
 * they explain no lead icon; the lists do. What a card *can* show, not what
 * this Visitor has: see `CardLegend`.
 */
const LEGENDS = {
  browse: ['rating', 'score', 'planned'],
  list: ['rating', 'score', 'planned', 'episode', 'date'],
} as const satisfies Record<string, readonly Glyph[]>;

/**
 * The key to a page's cards, under everything else on it. It reads no Viewer
 * and waits on nothing, so a page draws it in its shell, outside the
 * boundaries its cards stream into, and it never moves when they land. The
 * price is that a Visitor sees "Your Score" and "Planned" explained though no
 * card of theirs will wear either, and an empty tab keeps its legend.
 *
 * Each mark is drawn by the `CardGlyph` the card draws it with, so the legend
 * cannot explain a colour the card does not use.
 */
const CardLegend = ({
  entries,
}: {
  entries: readonly Glyph[];
}): JSX.Element => (
  <ul
    aria-label='What a card shows'
    className='mt-5 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5 border-white/7 border-t pt-5.5'
  >
    {entries.map((glyph) => (
      <li
        key={glyph}
        className='flex items-center gap-2 text-muted-foreground text-sm'
      >
        <CardGlyph glyph={glyph} className='size-4 shrink-0' />
        {WORDS[glyph]}
      </li>
    ))}
  </ul>
);

export { CardLegend, LEGENDS };
