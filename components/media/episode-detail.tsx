import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

import {
  DetailFrame,
  DetailHeading,
  DetailOverview,
} from '@/components/media/detail-frame';
import { type EpisodeDetails, mediaAddress, seasonAddress } from '@/lib/media';

/**
 * An Episode's page: its still where a backdrop would be, and above its name
 * the Show and the season it belongs to, each a link back up. Back goes to the
 * season, which is where a Visitor following Episodes in order came from.
 */
const EpisodeDetail = ({
  episode,
  control,
}: {
  episode: EpisodeDetails;
  /**
   * What the page puts under the heading: the Episode's star row, or a line
   * saying why there is none. A slot for the reason `MediaDetail`'s is one —
   * this component renders an Episode and never learns Watch Records exist.
   */
  control?: ReactNode;
}): JSX.Element => {
  const season = seasonAddress(episode.show.id, episode.season.number);

  return (
    <DetailFrame
      backdropUrl={episode.stillUrl}
      posterUrl={episode.posterUrl}
      back={season}
    >
      <p className='flex flex-wrap gap-x-2 text-sm'>
        <Link
          href={mediaAddress({ kind: 'tv', id: episode.show.id })}
          className='font-extrabold underline-offset-4 hover:underline'
        >
          {episode.show.label}
        </Link>
        <span aria-hidden='true' className='opacity-40'>
          ·
        </span>
        <Link href={season} className='underline-offset-4 hover:underline'>
          {episode.season.label}
        </Link>
        <span aria-hidden='true' className='opacity-40'>
          ·
        </span>
        <span className='opacity-60'>Episode {episode.number}</span>
      </p>

      <DetailHeading
        label={episode.label}
        rating={episode.rating}
        voteCount={episode.voteCount}
        facts={episode.facts}
      />

      {control ? <div className='max-w-xs'>{control}</div> : null}

      <DetailOverview overview={episode.overview} />
    </DetailFrame>
  );
};

export { EpisodeDetail };
