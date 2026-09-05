import Image from 'next/image';
import Link from 'next/link';
import type { JSX } from 'react';

import { Star } from 'lucide-react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import type { MediaItem } from '@/lib/media';

const MediaCard = ({ item }: { item: MediaItem }): JSX.Element => {
  return (
    <li className='transition duration-150 ease-out hover:-translate-y-1.5 hover:shadow-lg focus-within:-translate-y-1.5 focus-within:ring-2 focus-within:ring-ring'>
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
          <div className='flex shrink-0 items-center gap-1 whitespace-nowrap font-extrabold text-xs'>
            <Star size={12} className='fill-current' />
            <p>{item.rating.toFixed(1)}</p>
          </div>
        </div>
      </Link>
    </li>
  );
};
export { MediaCard };
