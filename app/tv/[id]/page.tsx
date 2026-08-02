import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';

import { backdropUrl, posterUrl, showDetails } from '@/lib/tmdb';

const DetailedShowPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> => {
  const { id } = await params;

  const showId = Number(id);

  if (!/^[1-9]\d{0,8}$/.test(id)) notFound();

  const show = await showDetails(showId);

  return (
    <main className='mx-auto w-full max-w-300 flex-1'>
      <div className='relative h-70 w-full overflow-hidden sm:h-88 lg:h-105'>
        {show.backdrop_path ? (
          <Image
            src={backdropUrl(show.backdrop_path)}
            fill
            // decorative: the page's accessible name comes from the <h2> below it
            alt=''
            className='object-cover'
            sizes='(min-width: 1200px) 1200px, 100vw'
            priority
          />
        ) : (
          <div className='flex h-full items-center justify-center bg-muted text-muted-foreground text-sm'>
            brak tła
          </div>
        )}
        {/* fades the bottom 60% of the backdrop into the page background */}
        <div className='pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-40% to-background' />
      </div>
      <div className='px-8 pb-8'>
        {show.poster_path ? (
          <Image
            src={posterUrl(show.poster_path)}
            width={780}
            height={1170}
            // decorative: the page's accessible name comes from the <h2> below it
            alt=''
            // the top ~36% of the poster overlaps the backdrop
            className='relative -mt-23 h-auto w-42 shadow-[0_12px_32px_rgb(0_0_0/0.35)] sm:-mt-28 sm:w-52 lg:-mt-35 lg:w-65'
            sizes='(min-width: 1024px) 260px, (min-width: 640px) 208px, 168px'
          />
        ) : (
          <div className='relative -mt-23 flex w-42 aspect-2/3 items-center justify-center bg-muted text-muted-foreground text-sm shadow-[0_12px_32px_rgb(0_0_0/0.35)] sm:-mt-28 sm:w-52 lg:-mt-35 lg:w-65'>
            brak plakatu
          </div>
        )}
        <h2>{show.name}</h2>
        <p>{show.overview}</p>
        <p>{show.first_air_date}</p>
        <p>{show.number_of_episodes}</p>
        <p>{show.number_of_seasons}</p>
        <p>{show.vote_average}</p>
      </div>
    </main>
  );
};

export default DetailedShowPage;
