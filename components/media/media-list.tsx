import type { JSX } from 'react';

import { MediaCard } from '@/components/media/media-card';
import { type Movie, type ShowCard, toMediaItem } from '@/lib/tmdb';

const MediaList = ({ media }: { media: (ShowCard | Movie)[] }): JSX.Element => {
  return (
    <ul className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {media.map((entry) => {
        const item = toMediaItem(entry);

        return <MediaCard item={item} key={item.id} />;
      })}
    </ul>
  );
};

export { MediaList };
