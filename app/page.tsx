import type { JSX } from 'react';

import { MediaList } from '@/components/media/media-list';
import { SearchForm } from '@/components/search/search-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { viewer } from '@/lib/auth';
import { trendingMovies, trendingShows } from '@/lib/media';
import { toLookup } from '@/lib/watch';
import { answeredWatchLookup } from '@/lib/watch-queries';

const HomePage = async (): Promise<JSX.Element> => {
  const [shows, movies, currentViewer] = await Promise.all([
    trendingShows(),
    trendingMovies(),
    viewer(),
  ]);

  // one query for both tabs' cards, and none for a Visitor: no Viewer means
  // no Watch Record, which is an empty lookup rather than an Unanswered one
  const lookup = currentViewer
    ? await answeredWatchLookup(currentViewer.id, [...shows, ...movies])
    : toLookup([]);

  return (
    <main className='flex-1 p-4'>
      <div className='mx-auto w-full max-w-5xl py-4'>
        <SearchForm />
      </div>
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
          <MediaList media={shows} lookup={lookup} />
        </TabsContent>
        <TabsContent value='movies' className='w-full'>
          {/* one h1 per page: Base UI unmounts the inactive panel, so only the
              selected tab's heading is ever in the DOM */}
          <h1 className='text-xl font-bold py-4'>Trending movies this week:</h1>
          <MediaList media={movies} lookup={lookup} />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default HomePage;
