import Image from 'next/image';
import type { JSX } from 'react';

import { Star } from 'lucide-react';

import type { MediaItem } from '@/lib/tmdb';

const MediaCard = ({ item }: { item: MediaItem }): JSX.Element => {
  return (
    <li className='transition duration-300 ease-out hover:-translate-y-2 cursor-pointer hover:ring-2 hover:ring-ring'>
      {item.posterUrl ? (
        <Image
          src={item.posterUrl}
          width={780}
          height={1170}
          // decorative: the title is announced by the adjacent <h3></h3>
          alt=''
          className='h-auto w-full'
          sizes='(min-width: 1024px) 244px, (min-width: 640px) 50vw, 100vw'
        />
      ) : (
        <div className='flex aspect-2/3 items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm '>
          brak plakatu
        </div>
      )}
      <div className='flex justify-between p-2 bg-primary text-primary-foreground'>
        <h3 className='min-w-0 truncate font-semibold' title={item.label}>
          {item.label}
        </h3>
        <div className='shrink-0 font-semibold flex items-center gap-1'>
          <span>
            <Star size={14} fill='white' />
          </span>
          <p>{item.rating.toFixed(1)}</p>{' '}
        </div>
      </div>
    </li>
  );
};
export { MediaCard };
