import { type JSX, Suspense } from 'react';

import { MediaList } from '@/components/media/media-list';
import { MediaGridSkeleton } from '@/components/media/media-skeleton';
import { SearchForm } from '@/components/search/search-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { answeredViewer } from '@/lib/auth';
import {
  KIND_WORDS,
  KINDS,
  type Kind,
  type MediaItem,
  trendingMedia,
} from '@/lib/media';
import type { WatchLookup } from '@/lib/watch';
import { answeredWatchLookup } from '@/lib/watch-queries';

/** One tab's panel: the heading, and whatever the panel has to show under it. */
const TrendingPanel = ({
  kind,
  children,
}: {
  kind: Kind;
  children: React.ReactNode;
}): JSX.Element => (
  <TabsContent value={kind} className='w-full'>
    {/* one h1 per page: Base UI unmounts the inactive panel, so only the
        selected tab's heading is ever in the DOM */}
    <h1 className='text-xl font-bold py-4'>
      Trending {KIND_WORDS[kind].other} this week:
    </h1>
    {children}
  </TabsContent>
);

/** What a Kind's panel opens on: its list, or the sentence for its absence. */
const TrendingList = ({
  kind,
  media,
  lookup,
}: {
  kind: Kind;
  media: MediaItem[] | null;
  lookup: WatchLookup | null;
}): JSX.Element =>
  media === null ? (
    // an Unanswered Kind, said the way the search page says it
    <p className='opacity-60'>
      TMDB did not answer for {KIND_WORDS[kind].other}. Try that again in a
      moment.
    </p>
  ) : (
    <MediaList media={media} lookup={lookup} />
  );

/**
 * Both panels, behind one boundary: the Watch Record lookup is one query
 * for every card on both tabs, so the two cannot stream apart without
 * paying for it twice.
 */
const TrendingPanels = async (): Promise<JSX.Element> => {
  const [trending, asked] = await Promise.all([
    trendingMedia(),
    answeredViewer(),
  ]);

  // one query for both tabs' cards — and none when the sign-in went
  // Unanswered, which the cards render as they render an Unanswered lookup
  const lookup =
    asked.answer === 'unanswered'
      ? null
      : await answeredWatchLookup(
          asked.answer === 'viewer' ? asked.viewer.id : null,
          [...(trending.tv ?? []), ...(trending.movie ?? [])],
        );

  return (
    <>
      {KINDS.map((kind) => (
        <TrendingPanel key={kind} kind={kind}>
          <TrendingList kind={kind} media={trending[kind]} lookup={lookup} />
        </TrendingPanel>
      ))}
    </>
  );
};

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
      {/* the form and the tabs are the shell; the panels stream into it */}
      <Suspense
        fallback={KINDS.map((kind) => (
          <TrendingPanel key={kind} kind={kind}>
            <MediaGridSkeleton />
          </TrendingPanel>
        ))}
      >
        <TrendingPanels />
      </Suspense>
    </Tabs>
  </main>
);

export default HomePage;
