import type { JSX } from 'react';

import { type Movie, type Show, toMediaItem } from '@/lib/tmdb';

import MediaCard from './media-card';

const MediaList = ({ media }: { media: (Show | Movie)[] }): JSX.Element => {
  return (
    <ul className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {media.map((entry) => {
        const item = toMediaItem(entry);

        return <MediaCard item={item} key={item.id} />;
      })}
    </ul>
  );
};

export default MediaList;
