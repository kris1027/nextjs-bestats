import type { Metadata } from 'next';
import type { JSX } from 'react';

import { WatchRecordList } from '@/components/watch/watch-record-list';
import type { SearchParams } from '@/lib/search-params';

export const metadata: Metadata = {
  title: 'Upcoming',
  description: 'The shows and movies you are waiting for',
};

// `upcoming` is a static segment, so the standing rule about top-level
// routes holds.
const UpcomingPage = ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): JSX.Element => (
  // the promise, unread: the list reads `?page=` behind its own boundaries
  <WatchRecordList list='upcoming' searchParams={searchParams} />
);

export default UpcomingPage;
