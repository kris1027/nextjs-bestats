import type { JSX } from 'react';

import MediaCard from '@/components/ui/media-card';
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
              <MediaCard media={show} key={show.id} />
            ))}
          </ul>
        </TabsContent>
        <TabsContent value='movies'>
          <h2 className='text-xl bold font-bold'>
            Popularne filmy w tym tygodniu:
          </h2>
          <ul className='grid grid-cols-1 gap-4'>
            {movies.map((movie) => (
              <MediaCard media={movie} key={movie.id} />
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default HomePage;
