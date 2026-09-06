import type { JSX } from 'react';

import { MediaList } from '@/components/media/media-list';
import { SearchForm } from '@/components/search/search-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { viewer } from '@/lib/auth';
import {
  KIND_WORDS,
  KINDS,
  type Kind,
  type MediaItem,
  trendingMedia,
} from '@/lib/media';
import type { WatchLookup } from '@/lib/watch';
import { answeredWatchLookup } from '@/lib/watch-queries';

/** What each tab opens on: the Kind's list, or the sentence for its absence. */
const TrendingPanel = ({
  kind,
  media,
  lookup,
}: {
  kind: Kind;
  media: MediaItem[] | null;
  lookup: WatchLookup | null;
}): JSX.Element => {
  const words = KIND_WORDS[kind];

  return (
    <TabsContent value={kind} className='w-full'>
      {/* one h1 per page: Base UI unmounts the inactive panel, so only the
          selected tab's heading is ever in the DOM */}
      <h1 className='text-xl font-bold py-4'>
        Trending {words.other} this week:
      </h1>
      {media === null ? (
        // an Unanswered Kind, said the way the search page says it
        <p className='opacity-60'>
          TMDB did not answer for {words.other}. Try that again in a moment.
        </p>
      ) : (
        <MediaList media={media} lookup={lookup} />
      )}
    </TabsContent>
  );
};

const HomePage = async (): Promise<JSX.Element> => {
  const [trending, currentViewer] = await Promise.all([
    trendingMedia(),
    viewer(),
  ]);

  // one query for both tabs' cards
  const lookup = await answeredWatchLookup(currentViewer?.id ?? null, [
    ...(trending.tv ?? []),
    ...(trending.movie ?? []),
  ]);

  return (
    <main className='flex-1 p-4'>
      <div className='mx-auto w-full max-w-5xl py-4'>
        <SearchForm />
      </div>
      <Tabs defaultValue='tv' className='mx-auto w-full max-w-5xl items-center'>
        <TabsList>
          {KINDS.map((kind) => (
            <TabsTrigger key={kind} value={kind}>
              {KIND_WORDS[kind].label}
            </TabsTrigger>
          ))}
        </TabsList>
        {KINDS.map((kind) => (
          <TrendingPanel
            key={kind}
            kind={kind}
            media={trending[kind]}
            lookup={lookup}
          />
        ))}
      </Tabs>
    </main>
  );
};

export default HomePage;
