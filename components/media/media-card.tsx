import Image from 'next/image';
import Link from 'next/link';
import type { JSX } from 'react';

import { Star } from 'lucide-react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { MarkingControl } from '@/components/watch/marking-control';
import type { MediaItem } from '@/lib/media';
import { stateOf, type WatchLookup } from '@/lib/watch';

/**
 * `lookup` is the page's one query for every card on it, and the card reads
 * its own state out of it. `null` is Unanswered — the database did not say —
 * and the card renders no control rather than one claiming nothing is marked.
 * A signed-out Visitor's page passes an empty lookup instead, which is a
 * real absence: no Viewer, so no Watch Record.
 */
const MediaCard = ({
  item,
  lookup,
}: {
  item: MediaItem;
  lookup: WatchLookup | null;
}): JSX.Element => {
  return (
    <li className='flex flex-col transition duration-150 ease-out hover:-translate-y-1.5 hover:shadow-lg focus-within:-translate-y-1.5 focus-within:ring-2 focus-within:ring-ring'>
      <Link
        href={`/${item.kind}/${item.id}`}
        className='focus-visible:outline-hidden'
      >
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            width={780}
            height={1170}
            // decorative: the link's accessible name comes from the <h2> inside it
            alt=''
            className='h-auto w-full'
            sizes='(min-width: 1024px) 244px, (min-width: 640px) 50vw, 100vw'
          />
        ) : (
          <MediaPlaceholder artwork='poster' />
        )}
        <div className='flex items-center justify-between gap-2 bg-primary px-2.5 py-1.5 text-primary-foreground'>
          <h2
            className='min-w-0 truncate font-extrabold text-[13px] leading-[1.2]'
            title={item.label}
          >
            {item.label}
          </h2>
          {/* nobody has voted, so there is no rating to state — a 0.0 here
              would read as a score rather than as its absence */}
          {item.voteCount > 0 ? (
            <div className='flex shrink-0 items-center gap-1 whitespace-nowrap font-extrabold text-xs'>
              <Star size={12} className='fill-current' />
              <p>{item.rating.toFixed(1)}</p>
            </div>
          ) : null}
        </div>
      </Link>
      {/* outside the link: a button inside one is nested interactive content */}
      {lookup !== null ? (
        <div className='px-2.5 pt-2.5'>
          <MarkingControl media={item} state={stateOf(lookup, item)} />
        </div>
      ) : null}
    </li>
  );
};
export { MediaCard };
