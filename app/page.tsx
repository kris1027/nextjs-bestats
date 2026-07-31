import type { JSX } from 'react';

import { MediaList } from '@/components/media/media-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trendingMovies, trendingShows } from '@/lib/tmdb';

const HomePage = async (): Promise<JSX.Element> => {
  const [shows, movies] = await Promise.all([
    trendingShows(),
    trendingMovies(),
  ]);

  return (
    <main className='flex-1 p-4'>
      <Tabs
        defaultValue='shows'
        className='mx-auto w-full max-w-5xl items-center'
      >
        <TabsList>
          <TabsTrigger value='shows'>Seriale</TabsTrigger>
          <TabsTrigger value='movies'>Filmy</TabsTrigger>
        </TabsList>
        <TabsContent value='shows' className='w-full'>
          <h2 className='text-xl font-bold p-4'>
            Popularne seriale w tym tygodniu:
          </h2>
          <MediaList media={shows} />
        </TabsContent>
        <TabsContent value='movies' className='w-full'>
          <h2 className='text-xl font-bold p-4'>
            Popularne filmy w tym tygodniu:
          </h2>
          <MediaList media={movies} />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default HomePage;
