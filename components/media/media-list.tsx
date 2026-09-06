import type { JSX } from 'react';

import { MediaCard } from '@/components/media/media-card';
import type { MediaItem } from '@/lib/media';
import type { WatchLookup } from '@/lib/watch';

/** `lookup` passes straight through: each card reads its own state from it. */
const MediaList = ({
  media,
  lookup,
}: {
  media: MediaItem[];
  lookup: WatchLookup | null;
}): JSX.Element => {
  return (
    <ul className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {media.map((item) => (
        <MediaCard item={item} lookup={lookup} key={item.id} />
      ))}
    </ul>
  );
};

export { MediaList };
