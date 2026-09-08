import type { JSX } from 'react';

import { MediaCard } from '@/components/media/media-card';
import { MediaGrid } from '@/components/media/media-grid';
import type { MediaItem } from '@/lib/media';
import type { WatchLookup } from '@/lib/watch';

/**
 * `lookup` passes straight through: each card reads its own state from it.
 * So does `viewerKey`, which says whose states those are.
 */
const MediaList = ({
  media,
  lookup,
  viewerKey,
}: {
  media: MediaItem[];
  lookup: WatchLookup | null;
  viewerKey: string;
}): JSX.Element => {
  return (
    <MediaGrid>
      {media.map((item) => (
        <MediaCard
          item={item}
          lookup={lookup}
          viewerKey={viewerKey}
          key={item.id}
        />
      ))}
    </MediaGrid>
  );
};

export { MediaList };
