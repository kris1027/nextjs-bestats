import type { JSX } from 'react';

import MediaList from '@/components/media/media-list';
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
          <h2 className='text-xl font-bold'>
            Popularne seriale w tym tygodniu:
          </h2>
          <MediaList media={shows} />
        </TabsContent>
        <TabsContent value='movies'>
          <h2 className='text-xl font-bold'>Popularne filmy w tym tygodniu:</h2>
          <MediaList media={movies} />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default HomePage;
