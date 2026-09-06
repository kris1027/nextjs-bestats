import { cache, type JSX, Suspense } from 'react';

import { MediaList } from '@/components/media/media-list';
import { MediaGridSkeleton } from '@/components/media/media-skeleton';
import { SearchForm } from '@/components/search/search-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { answeredViewer } from '@/lib/auth';
import {
  KIND_WORDS,
  KINDS,
  type Kind,
  type Trending,
  trendingMedia,
} from '@/lib/media';
import type { WatchLookup } from '@/lib/watch';
import { answeredWatchLookup } from '@/lib/watch-queries';

/**
 * Both Kinds and one lookup for every card on both tabs, asked for once per
 * request however many panels ask: `cache` is what lets two sibling panels
 * share a request without a promise threaded through the client tabs.
 */
const trendingAndLookup = cache(
  async (): Promise<{ trending: Trending; lookup: WatchLookup | null }> => {
    const [trending, asked] = await Promise.all([
      trendingMedia(),
      answeredViewer(),
    ]);

    // none when the sign-in went Unanswered, which the cards render as they
    // render an Unanswered lookup
    const lookup =
      asked.answer === 'unanswered'
        ? null
        : await answeredWatchLookup(
            asked.answer === 'viewer' ? asked.viewer.id : null,
            [...(trending.tv ?? []), ...(trending.movie ?? [])],
          );

    return { trending, lookup };
  },
);

/** What a Kind's panel opens on: its list, or the sentence for its absence. */
const TrendingList = async ({ kind }: { kind: Kind }): Promise<JSX.Element> => {
  const { trending, lookup } = await trendingAndLookup();
  const media = trending[kind];

  return media === null ? (
    // an Unanswered Kind, said the way the search page says it
    <p className='opacity-60'>
      TMDB did not answer for {KIND_WORDS[kind].other}. Try that again in a
      moment.
    </p>
  ) : (
    <MediaList media={media} lookup={lookup} />
  );
};

/**
 * The form, the tab list and both panels' headings are the shell; each
 * panel's list streams into it. The boundary sits inside the panel rather
 * than around it because Base UI links a panel to its tab in an effect: a
 * panel that streams in after hydration renders that link where the server
 * rendered none, and React reports the difference.
 */
const HomePage = (): JSX.Element => (
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
        <TabsContent key={kind} value={kind} className='w-full'>
          {/* one h1 per page: Base UI unmounts the inactive panel, so only
              the selected tab's heading is ever in the DOM */}
          <h1 className='text-xl font-bold py-4'>
            Trending {KIND_WORDS[kind].other} this week:
          </h1>
          <Suspense fallback={<MediaGridSkeleton />}>
            <TrendingList kind={kind} />
          </Suspense>
        </TabsContent>
      ))}
    </Tabs>
  </main>
);

export default HomePage;
