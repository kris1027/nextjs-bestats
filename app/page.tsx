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
          <TabsTrigger value='shows'>Shows</TabsTrigger>
          <TabsTrigger value='movies'>Movies</TabsTrigger>
        </TabsList>
        <TabsContent value='shows' className='w-full'>
          <h1 className='text-xl font-bold py-4'>Trending shows this week:</h1>
          <MediaList media={shows} />
        </TabsContent>
        <TabsContent value='movies' className='w-full'>
          {/* one h1 per page: Base UI unmounts the inactive panel, so only the
              selected tab's heading is ever in the DOM */}
          <h1 className='text-xl font-bold py-4'>Trending movies this week:</h1>
          <MediaList media={movies} />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default HomePage;
