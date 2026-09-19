import Image from 'next/image';
import type { JSX } from 'react';

import type { LeadContent } from '@/components/media/lead-badge';
import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { CardHead } from '@/components/watch/card-head';
import { CardPlannedButton } from '@/components/watch/card-planned-button';
import {
  type EpisodeRef,
  episodeAddress,
  type MediaItem,
  mediaAddress,
} from '@/lib/media';
import { markingOf, scoreOf, type ViewerLookup } from '@/lib/watch';

/**
 * The pill a list card draws over its poster's lower corner: what it says,
 * what a screen reader hears it called, the icon it wears — a TV for an
 * Episode that is out, a calendar for a day or the want of one — and the
 * Episode the card leads to when it names one TMDB lists; `null` leaves the
 * card leading to the Media.
 */
type CardLead = LeadContent & { episode: EpisodeRef | null };

/**
 * A card shows what a Viewer said about a piece of Media, and lets them say
 * one thing of it: Planned, from the bookmark over its poster. Everything
 * else — a Score, stopping a Show — is the detail page's, which this card is
 * the link to. `AbsentCard` draws its own labelled button instead, because
 * Gone Media has no detail page to send anyone to.
 *
 * `lookup` is the page's one query for every card on it, and the card reads
 * its own Score out of it. `markings` is `null` for Unanswered — the database
 * did not say — and the badge then shows TMDB's Rating, which is what it
 * shows for a Viewer who has not scored this either; an Unanswered lookup
 * costs a Score that is there, never a wrong one.
 *
 * The bookmark holds its marking in state that outlives a render, so it is
 * keyed on the lookup's `viewerKey`, as every marking control is. The Score
 * holds none: it arrives as a prop from the server, and the render that
 * follows a sign-out simply does not carry it.
 *
 * `lead` is the pill a list card draws over its poster — a Show's next
 * Episode, when it airs, when a Movie is released — and, where it names an
 * Episode TMDB lists, the card links to that Episode's page rather than the
 * Show's, so watching a run is score, next, score. The badge is the Show's all
 * the same.
 */
const MediaCard = ({
  item,
  lookup,
  lead = null,
  underWay = false,
  eager = false,
}: {
  item: MediaItem;
  lookup: ViewerLookup;
  lead?: CardLead | null;
  /**
   * Whether the Viewer has scored an Episode of this Show, where the page
   * knows — the lists do. A Show under way has no Planned to go back to.
   */
  underWay?: boolean;
  /** One of the grid's first cards, whose poster is on the first screen. */
  eager?: boolean;
}): JSX.Element => {
  const poster = item.posterUrl ? (
    <Image
      src={item.posterUrl}
      width={780}
      height={1170}
      // decorative: the link's accessible name comes from the <h2> inside it
      alt=''
      className='size-full object-cover'
      // `MediaGrid`'s columns, restated as widths, because nothing but
      // this tells the browser how big the poster lands. Two columns
      // below `lg:` put a card at half the viewport less half the
      // page's padding and the gap between them; four columns above it
      // divide the 1024px the list is capped at. A stale `100vw` here
      // would have every phone fetch a poster twice the width it draws.
      sizes='(min-width: 1024px) 244px, calc(50vw - 24px)'
      loading={eager ? 'eager' : 'lazy'}
    />
  ) : (
    <MediaPlaceholder artwork='poster' />
  );

  const marking = lookup.markings && markingOf(lookup.markings, item);
  // Unanswered draws no control, as everywhere; and a press that would
  // destroy a Score, or that the action refuses, is not offered
  const plannable =
    lookup.markings !== null &&
    marking?.state !== 'watched' &&
    marking?.state !== 'stopped' &&
    !underWay;

  return (
    // `group`, which `PosterFrame` lifts on: the whole card is the target
    <li className='group relative flex flex-col'>
      <CardHead
        label={item.label}
        poster={poster}
        href={lead?.episode ? episodeAddress(lead.episode) : mediaAddress(item)}
        lead={lead ?? undefined}
        score={marking && scoreOf(marking)}
        tmdbRating={item}
      />
      {plannable ? (
        // the poster's box again, over the link rather than inside it, and
        // lifting with the frame so the bookmark stays on the poster
        <div className='pointer-events-none absolute inset-x-0 top-0 aspect-2/3 transition duration-200 ease-out motion-safe:group-focus-within:-translate-y-1 motion-safe:group-hover:-translate-y-1'>
          <CardPlannedButton
            key={lookup.viewerKey}
            media={item}
            label={item.label}
            marking={marking}
          />
        </div>
      ) : null}
    </li>
  );
};
export { type CardLead, MediaCard };
