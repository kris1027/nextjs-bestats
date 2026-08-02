import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';

import { backdropUrl, showDetails } from '@/lib/tmdb';

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
    <main className='flex-1 p-4'>
      {show.backdrop_path ? (
        <Image
          src={backdropUrl(show.backdrop_path)}
          width={1280}
          height={720}
          // decorative: the page's accessible name comes from the <h2> below it
          alt=''
          className='h-auto w-full'
          sizes='100vw'
          priority
        />
      ) : (
        <div className='flex aspect-video items-center justify-center bg-muted text-muted-foreground text-sm'>
          brak tła
        </div>
      )}
      <h2>{show.name}</h2>
      <p>{show.overview}</p>
      <p>{show.first_air_date}</p>
      <p>{show.number_of_episodes}</p>
      <p>{show.number_of_seasons}</p>
      <p>{show.vote_average}</p>
    </main>
  );
};

export default DetailedShowPage;
