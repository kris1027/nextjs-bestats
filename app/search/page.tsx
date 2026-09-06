import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';

import { MediaList } from '@/components/media/media-list';
import { KindTabs } from '@/components/search/kind-tabs';
import { SearchForm } from '@/components/search/search-form';
import { BackButton } from '@/components/ui/back-button';
import { answeredViewer } from '@/lib/auth';
import { formatTally } from '@/lib/format';
import {
  hasMatches,
  isKind,
  KIND_WORDS,
  type Kind,
  type Matches,
  matchedNothing,
  searchMedia,
} from '@/lib/media';
import { firstValue, type SearchParams } from '@/lib/search-params';
import { answeredWatchLookup } from '@/lib/watch-queries';

/**
 * Which tab opens when the address does not name one: a Kind with Matches
 * first, Shows when both have them. When neither has any, the unanswered Kind
 * opens, so a failed search is never left behind a closed tab.
 */
const defaultKind = (shows: Matches | null, movies: Matches | null): Kind => {
  if (hasMatches(shows)) return 'tv';
  if (hasMatches(movies)) return 'movie';

  return shows === null ? 'tv' : 'movie';
};

/**
 * The frame every state of this page shares: the back affordance and the
 * search form, wrapped around whatever that state has to say. An empty Query,
 * a Query nothing matched, a Query neither Kind answered and a Query with
 * Matches differ only in `children`, so the frame is written once here rather
 * than four times below.
 */
const Shell = ({
  query,
  children,
}: {
  query: string;
  children: ReactNode;
}): JSX.Element => (
  <main className='flex-1 p-4'>
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 py-4'>
      <BackButton href='/' className='self-start'>
        Back to trending
      </BackButton>
      <SearchForm query={query} />
      {children}
    </div>
  </main>
);

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> => {
  const query = firstValue((await searchParams).q).trim();

  return { title: query ? `Search: ${query}` : 'Search' };
};

const SearchPage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> => {
  const params = await searchParams;
  const query = firstValue(params.q).trim();

  // Nothing was asked, so there is nothing to ask TMDB. An empty query would
  // return an empty page and be reported as "nothing matches" a query nobody
  // typed.
  if (!query) {
    return (
      <Shell query={query}>
        <h1 className='font-black text-3xl leading-[1.05]'>Search</h1>
        <p className='opacity-60'>
          Find a show or a movie by name. Everything here comes from TMDB.
        </p>
      </Shell>
    );
  }

  const [search, asked] = await Promise.all([
    searchMedia(query),
    answeredViewer(),
  ]);
  const { tv: shows, movie: movies } = search;

  const heading = (
    <h1 className='font-black text-3xl leading-[1.05]'>
      Matches for “{query}”
    </h1>
  );

  // Neither Kind answered, so the page cannot report what matched — and must
  // not report that nothing did. Still a 200, for the same reason as below.
  if (!shows && !movies) {
    return (
      <Shell query={query}>
        {heading}
        <p className='opacity-60'>
          TMDB did not answer. Try that search again in a moment.
        </p>
      </Shell>
    );
  }

  // Both Kinds answered and both are empty, so tabs would be two empty panels
  // wearing a `0` apiece. Returning before `KindTabs` leaves `?kind=` inert
  // here on purpose: it earns its place in the address by opening the list the
  // sender meant and by letting a closed tab admit what waits behind it, and
  // there is no list on either side to do either for.
  // — `docs/adr/0004-search-is-two-searches.md`
  //
  // Still a 200: there is a search box at this address, which is what the
  // visitor needs next.
  if (matchedNothing(shows) && matchedNothing(movies)) {
    return (
      <Shell query={query}>
        {heading}
        <p className='opacity-60'>
          Nothing on TMDB matches that. Try fewer words, or a different
          spelling.
        </p>
      </Shell>
    );
  }

  // The address names the tab. Absent, it opens on whichever Kind has
  // something to show — Shows when both do.
  const kind = firstValue(params.kind);
  const selected: Kind = isKind(kind) ? kind : defaultKind(shows, movies);
  const matches = search[selected];
  const words = KIND_WORDS[selected];

  // one query for both Kinds' cards, the closed tab being a link away — and
  // none when the sign-in went Unanswered, as on the home page
  const lookup =
    asked.answer === 'unanswered'
      ? null
      : await answeredWatchLookup(
          asked.answer === 'viewer' ? asked.viewer.id : null,
          [...(shows?.items ?? []), ...(movies?.items ?? [])],
        );

  return (
    <Shell query={query}>
      {heading}
      <KindTabs query={query} selected={selected} search={search} />
      {matches === null ? (
        <p className='opacity-60'>
          TMDB did not answer for {words.other}. Try that search again in a
          moment.
        </p>
      ) : matches.items.length > 0 ? (
        <>
          <p className='text-sm opacity-60'>
            Showing {formatTally(matches.items.length, matches.total, words)}
          </p>
          <MediaList media={matches.items} lookup={lookup} />
        </>
      ) : (
        <p className='opacity-60'>
          No {words.other} match “{query}”.
        </p>
      )}
    </Shell>
  );
};

export default SearchPage;
