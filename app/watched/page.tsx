import type { Metadata } from 'next';
import type { JSX } from 'react';

import { WatchRecordList } from '@/components/watch/watch-record-list';
import type { SearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Watched',
  description: 'The shows and movies you have watched',
};

// `watched` is a static segment, so the standing rule about top-level
// routes holds — docs/adr/0001-one-route-serves-both-kinds.md
const WatchedPage = ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): JSX.Element => (
  // the promise, unread: the list reads `?page=` behind its own boundaries
  <WatchRecordList state='watched' searchParams={searchParams} />
);

export default WatchedPage;
