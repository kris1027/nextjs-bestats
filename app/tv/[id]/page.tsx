import { notFound } from 'next/navigation';

import { showDetails } from '@/lib/tmdb';

const DetailedShowPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const showId = Number(id);

  if (!Number.isInteger(showId) || showId <= 0) notFound();

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
