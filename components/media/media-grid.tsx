import type { JSX, ReactNode } from 'react';

/**
 * The grid every list of cards sits in. A component of its own so a list
 * that mixes `MediaCard` with another card — the lists do, for Media TMDB
 * will not answer for — shares the one set of columns rather than a copy.
 *
 * Two columns before four, and never one. A single column on a phone gives
 * each poster the whole width, which is 600px of card apiece and a page of
 * twenty that cannot show two things at once — a stack of billboards rather
 * than a grid to scan.
 *
 * `MediaCard` states these same columns a second time, as the `sizes` its
 * poster is fetched by. The two are one decision said in two places, since
 * nothing but the markup tells a browser how wide the image will be.
 */
const MediaGrid = ({ children }: { children: ReactNode }): JSX.Element => (
  <ul className='grid grid-cols-2 gap-4 lg:grid-cols-4'>{children}</ul>
);

export { MediaGrid };
