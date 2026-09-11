import Image from 'next/image';
import type { JSX } from 'react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { CardHead } from '@/components/watch/card-head';
import type { MediaItem } from '@/lib/media';
import { markingOf, scoreOf, type ViewerLookup } from '@/lib/watch';

/**
 * A card shows what a Viewer said about a piece of Media and gives them no
 * way to say it: marking is the detail page's alone, and this card is the
 * link there. `AbsentCard` is the one exception, because Gone Media has no
 * detail page to send anyone to.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 *
 * `lookup` is the page's one query for every card on it, and the card reads
 * its own Score out of it. `markings` is `null` for Unanswered — the database
 * did not say — and the badge then shows TMDB's Rating, which is what it
 * shows for a Viewer who has not scored this either; an Unanswered lookup
 * costs a Score that is there, never a wrong one.
 *
 * Nothing here outlives a render, so this card takes no `viewerKey`: the
 * Score arrives as a prop from the server, and the render that follows a
 * sign-out simply does not carry it. Only a card that holds a marking of its
 * own needs the key, which is `AbsentCard` and the detail page.
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

  const marking = lookup.markings && markingOf(lookup.markings, item);

  return (
    <li className='flex flex-col transition duration-150 ease-out hover:-translate-y-1.5 hover:shadow-lg focus-within:-translate-y-1.5 focus-within:ring-2 focus-within:ring-ring'>
      <CardHead
        label={item.label}
        poster={poster}
        href={`/${item.kind}/${item.id}`}
        score={marking && scoreOf(marking)}
        tmdbRating={item}
      />
    </li>
  );
};
export { MediaCard };
