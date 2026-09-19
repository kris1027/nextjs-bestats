import type { JSX, ReactNode } from 'react';

/**
 * The rounded box a card's poster sits in, and the pills laid over it. The
 * card is the one rounded thing in the app: the detail page, its controls and
 * its Facts stay square, so the rounding lives here and nowhere else.
 *
 * The lift answers the card's `group` rather than the frame's own hover, so
 * pointing at the title under the poster lifts it too, and keyboard focus
 * anywhere in the card looks the same as a pointer over it. Focus adds the
 * ring as well: a border changing colour is not enough to find the focus by.
 * The lift is motion, so a Visitor who asked for less gets the border alone.
 */
const PosterFrame = ({
  poster,
  children,
}: {
  poster: ReactNode;
  /** The pills, each placing itself in its own corner. */
  children?: ReactNode;
}): JSX.Element => (
  <div className='relative aspect-2/3 overflow-hidden rounded-xl border border-white/8 bg-card transition duration-200 ease-out group-focus-within:border-score/45 group-focus-within:shadow-lg group-focus-within:ring-2 group-focus-within:ring-ring group-hover:border-score/45 group-hover:shadow-lg motion-safe:group-focus-within:-translate-y-1 motion-safe:group-hover:-translate-y-1'>
    {poster}
    {children}
  </div>
);

export { PosterFrame };
