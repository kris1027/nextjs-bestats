import type { JSX } from 'react';

import { MediaCard } from '@/components/media/media-card';
import { MediaGrid } from '@/components/media/media-grid';
import type { MediaItem } from '@/lib/media';
import type { ViewerLookup } from '@/lib/watch';

/**
 * `lookup` passes straight through: each card reads its own state from it,
 * and the Viewer those states belong to travels on it.
 */
const MediaList = ({
  media,
  lookup,
}: {
  media: MediaItem[];
  lookup: ViewerLookup;
}): JSX.Element => {
  return (
    <MediaGrid>
      {media.map((item) => (
        <MediaCard item={item} lookup={lookup} key={item.id} />
      ))}
    </MediaGrid>
  );
};

export { MediaList };
