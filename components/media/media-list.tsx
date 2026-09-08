import type { JSX } from 'react';

import { MediaCard } from '@/components/media/media-card';
import { MediaGrid } from '@/components/media/media-grid';
import type { MediaItem } from '@/lib/media';
import type { WatchLookup } from '@/lib/watch';

/**
 * `lookup` passes straight through: each card reads its own state from it.
 * So does `viewerId`, which says whose states those are.
 */
const MediaList = ({
  media,
  lookup,
  viewerId,
}: {
  media: MediaItem[];
  lookup: WatchLookup | null;
  viewerId: string | null;
}): JSX.Element => {
  return (
    <MediaGrid>
      {media.map((item) => (
        <MediaCard
          item={item}
          lookup={lookup}
          viewerId={viewerId}
          key={item.id}
        />
      ))}
    </MediaGrid>
  );
};

export { MediaList };
