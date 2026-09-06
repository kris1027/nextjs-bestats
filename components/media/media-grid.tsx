import type { JSX, ReactNode } from 'react';

/**
 * The grid every list of cards sits in. A component of its own so a list
 * that mixes `MediaCard` with another card — the lists do, for Media TMDB
 * will not answer for — shares the one set of columns rather than a copy.
 */
const MediaGrid = ({ children }: { children: ReactNode }): JSX.Element => (
  <ul className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
    {children}
  </ul>
);

export { MediaGrid };
