import Image from 'next/image';
import type { JSX } from 'react';

import type { Movie, Show } from '@/lib/tmdb';

const MediaCard = ({ media }: { media: Show | Movie }): JSX.Element => {
  return (
    <li>
      {media.poster_path ? (
        <Image
          src={`${process.env.NEXT_PUBLIC_TMDB_POSTER_PATH}${media.poster_path}`}
          width={342}
          height={513}
          alt=''
          className='h-auto w-full'
        />
      ) : (
        <div className='flex aspect-2/3 items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm '>
          brak plakatu
        </div>
      )}
      <div className='flex justify-between p-1'>
        <h3 className='font-semibold'>
          {media.media_type === 'movie' ? media.title : media.name}
        </h3>
        <p className='font-semibold'>{media.vote_average.toFixed(1)}</p>
      </div>
    </li>
  );
};
export default MediaCard;
