import type { Metadata } from 'next';
import type { JSX } from 'react';

import { WatchRecordList } from '@/components/watch/watch-record-list';
import type { SearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'The shows and movies you mean to watch',
};

// `watchlist` is a static segment, so the standing rule about top-level
// routes holds — docs/adr/0001-one-route-serves-both-kinds.md
const WatchlistPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> => (
  <WatchRecordList state='planned' page={(await searchParams).page} />
);

export default WatchlistPage;
