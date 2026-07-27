import Image from 'next/image';

type ShowProps = {
  id: number;
  name: string;
  poster_path: string;
  vote_average: number;
};

const HomePage = async () => {
  const res = await fetch(`${process.env.TMDB_API_URL}/trending/tv/week`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_API_TOKEN}` },
  });

  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`);

  const data = await res.json();
  const shows: ShowProps[] = data.results;

  return (
    <main className='p-4 flex flex-col items-center gap-4'>
      <h1 className='text-xl bold font-bold'>
        Popularne seriale w tym tygodniu:
      </h1>
      <ul className='grid grid-cols-2 gap-4'>
        {shows.map((show) => (
          <li key={show.id}>
            <Image
              src={`${process.env.TMDB_POSTER_PATH}${show.poster_path}`}
              width={342}
              height={513}
              alt={show.name}
              loading='eager'
            />
            <div className='flex justify-between p-1'>
              <h2 className='font-semibold'>{show.name}</h2>
              <p className='font-semibold'>{show.vote_average.toFixed(1)}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
};

export default HomePage;
