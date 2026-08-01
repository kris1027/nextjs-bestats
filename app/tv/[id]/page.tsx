import { notFound } from 'next/navigation';
import type { JSX } from 'react';

import { showDetails } from '@/lib/tmdb';

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
    <main>
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
