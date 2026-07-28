import Image from 'next/image';
import type { JSX } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trendingMovies, trendingShows } from '@/lib/tmdb';

const HomePage = async (): Promise<JSX.Element> => {
  const [shows, movies] = await Promise.all([
    trendingShows(),
    trendingMovies(),
  ]);

  return (
    <main className='p-4 flex flex-col items-center gap-4'>
      <Tabs defaultValue='shows' className='flex items-center'>
        <TabsList>
          <TabsTrigger value='shows'>Seriale</TabsTrigger>
          <TabsTrigger value='movies'>Filmy</TabsTrigger>
        </TabsList>
        <TabsContent value='shows'>
          <h2 className='text-xl bold font-bold'>
            Popularne seriale w tym tygodniu:
          </h2>
          <ul className='grid grid-cols-1 gap-4'>
            {shows.map((show) => (
              <li key={show.id}>
                {show.poster_path ? (
                  <Image
                    src={`${process.env.TMDB_POSTER_PATH}${show.poster_path}`}
                    width={342}
                    height={513}
                    alt={show.name}
                    loading='eager'
                    className='h-auto w-full'
                  />
                ) : (
                  <div className='flex aspect-2/3 items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm '>
                    brak plakatu
                  </div>
                )}
                <div className='flex justify-between p-1'>
                  <h2 className='font-semibold'>{show.name}</h2>
                  <p className='font-semibold'>
                    {show.vote_average.toFixed(1)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value='movies'>
          <h2 className='text-xl bold font-bold'>
            Popularne filmy w tym tygodniu:
          </h2>
          <ul className='grid grid-cols-1 gap-4'>
            {movies.map((movie) => (
              <li key={movie.id}>
                {movie.poster_path ? (
                  <Image
                    src={`${process.env.TMDB_POSTER_PATH}${movie.poster_path}`}
                    width={342}
                    height={513}
                    alt={movie.title}
                    loading='eager'
                    className='h-auto w-full'
                  />
                ) : (
                  <div className='flex aspect-2/3 items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm '>
                    brak plakatu
                  </div>
                )}
                <div className='flex justify-between p-1'>
                  <h2 className='font-semibold'>{movie.title}</h2>
                  <p className='font-semibold'>
                    {movie.vote_average.toFixed(1)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default HomePage;
