import type { JSX } from 'react';

import { MediaCard } from '@/components/media/media-card';
import type { MediaItem } from '@/lib/media';

const MediaList = ({ media }: { media: MediaItem[] }): JSX.Element => {
  return (
    <ul className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {media.map((item) => (
        <MediaCard item={item} key={item.id} />
      ))}
    </ul>
  );
};

export { MediaList };
