import Image from 'next/image';
import type { JSX } from 'react';

import type { Movie, Show } from '@/lib/tmdb';

const MediaCard = ({ media }: { media: Show | Movie }): JSX.Element => {
  const label = media.media_type === 'movie' ? media.title : media.name;

  return (
    <li>
      {media.poster_path ? (
        <Image
          src={`${process.env.NEXT_PUBLIC_TMDB_POSTER_PATH}${media.poster_path}`}
          width={780}
          height={1170}
          alt=''
          className='h-auto w-full'
          sizes='(min-width: 1024px) 244px, (min-width: 640px) 50vw, 100vw'
        />
      ) : (
        <div className='flex aspect-2/3 items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm '>
          brak plakatu
        </div>
      )}
      <div className='flex justify-between p-1'>
        <h3 className='min-w-0 truncate font-semibold' title={label}>
          {label}
        </h3>
        <p className='shrink-0 font-semibold'>
          {media.vote_average.toFixed(1)}
        </p>
      </div>
    </li>
  );
};
export default MediaCard;
