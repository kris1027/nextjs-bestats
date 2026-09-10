import Image from 'next/image';
import type { JSX } from 'react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { CardHead } from '@/components/watch/card-head';
import { MarkableCard } from '@/components/watch/markable-card';
import type { MediaItem } from '@/lib/media';
import { markingOf, type ViewerLookup } from '@/lib/watch';

/**
 * `lookup` is the page's one query for every card on it, and the card reads
 * its own marking out of it. `states` is `null` for Unanswered — the database
 * did not say — and the card draws its head alone, with no control and no
 * Score, rather than one claiming nothing is marked. A signed-out Visitor's
 * page passes an empty lookup instead, which is a real absence: no Viewer, so
 * no Watch Record.
 *
 * The lookup carries whose Watch Records those are, and that is the card's
 * key and nothing it renders. See `viewerKey` in `lib/auth`.
 */
const MediaCard = ({
  item,
  lookup,
}: {
  item: MediaItem;
  lookup: ViewerLookup;
}): JSX.Element => {
  const poster = item.posterUrl ? (
    <Image
      src={item.posterUrl}
      width={780}
      height={1170}
      // decorative: the link's accessible name comes from the <h2> inside it
      alt=''
      className='h-auto w-full'
      // `MediaGrid`'s columns, restated as widths, because nothing but
      // this tells the browser how big the poster lands. Two columns
      // below `lg:` put a card at half the viewport less half the
      // page's padding and the gap between them; four columns above it
      // divide the 1024px the list is capped at. A stale `100vw` here
      // would have every phone fetch a poster twice the width it draws.
      sizes='(min-width: 1024px) 244px, calc(50vw - 24px)'
    />
  ) : (
    <MediaPlaceholder artwork='poster' />
  );

  const href = `/${item.kind}/${item.id}`;

  return (
    <li className='flex flex-col transition duration-150 ease-out hover:-translate-y-1.5 hover:shadow-lg focus-within:-translate-y-1.5 focus-within:ring-2 focus-within:ring-ring'>
      {lookup.states !== null ? (
        <MarkableCard
          key={lookup.viewerKey}
          media={item}
          marking={markingOf(lookup.states, item)}
          label={item.label}
          poster={poster}
          href={href}
          tmdbRating={item}
        />
      ) : (
        <CardHead
          label={item.label}
          poster={poster}
          href={href}
          score={null}
          tmdbRating={item}
        />
      )}
    </li>
  );
};
export { MediaCard };
