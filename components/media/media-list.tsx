import type { JSX } from 'react';

import { MediaCard } from '@/components/media/media-card';
import { MediaGrid } from '@/components/media/media-grid';
import type { MediaItem } from '@/lib/media';
import { type ViewerLookup, watchKey } from '@/lib/watch';

/**
 * `lookup` passes straight through: each card reads its own Score from it.
 *
 * A card is keyed on `watchKey` — the Kind and the id — and never the id
 * alone. A TMDB id is unique only within a Kind, so on `/search`, where the
 * two Kinds swap under the same tree position, a Show and a Movie sharing an
 * id would share a key and React would keep one card for both.
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
        <MediaCard item={item} lookup={lookup} key={watchKey(item)} />
      ))}
    </MediaGrid>
  );
};

export { MediaList };
