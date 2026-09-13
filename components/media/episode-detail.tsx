import Link from 'next/link';
import type { JSX } from 'react';

import { DetailFrame, DetailRating } from '@/components/media/detail-frame';
import { Tag } from '@/components/ui/tag';
import { type EpisodeDetails, mediaAddress, seasonAddress } from '@/lib/media';

/**
 * An Episode's page: its still where a backdrop would be, and above its name
 * the Show and the season it belongs to, each a link back up. Back goes to the
 * season, which is where a Visitor following Episodes in order came from.
 */
const EpisodeDetail = ({
  episode,
}: {
  episode: EpisodeDetails;
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

      <h1 className='break-words font-black text-3xl leading-[1.05] lg:text-[40px]'>
        {episode.label}
      </h1>

      <div className='flex flex-wrap items-center gap-6'>
        <DetailRating rating={episode.rating} voteCount={episode.voteCount} />
        {/* facts arrive formatted and unique, so each is its own key */}
        {episode.facts.map((fact) => (
          <Tag key={fact}>{fact}</Tag>
        ))}
      </div>

      <div className='my-2 h-0.5 bg-foreground/40' />

      {episode.overview ? (
        <p className='max-w-[62ch] text-base leading-relaxed'>
          {episode.overview}
        </p>
      ) : null}
    </DetailFrame>
  );
};

export { EpisodeDetail };
