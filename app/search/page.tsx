import type { Metadata } from 'next';
import { type JSX, Suspense } from 'react';

import { MediaList } from '@/components/media/media-list';
import { MediaGridSkeleton } from '@/components/media/media-skeleton';
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

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> => {
  const query = firstValue((await searchParams).q).trim();

  return { title: query ? `Search: ${query}` : 'Search' };
};

/**
 * What a Query found, once TMDB has answered. Behind its own boundary, so
 * the form and the heading stand while the two requests run; `kind` arrives
 * as the address spelt it, since which tab opens depends on what answered.
 */
const MatchesFor = async ({
  query,
  kind,
}: {
  query: string;
  kind: string;
}): Promise<JSX.Element> => {
  const [search, asked] = await Promise.all([
    searchMedia(query),
    answeredViewer(),
  ]);
  const { tv: shows, movie: movies } = search;

  // Neither Kind answered, so the page cannot report what matched — and must
  // not report that nothing did. Still a 200, for the same reason as below.
  if (!shows && !movies) {
    return (
      <p className='opacity-60'>
        TMDB did not answer. Try that search again in a moment.
      </p>
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
      <p className='opacity-60'>
        Nothing on TMDB matches that. Try fewer words, or a different spelling.
      </p>
    );
  }

  // The address names the tab. Absent, it opens on whichever Kind has
  // something to show — Shows when both do.
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
    <>
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
    </>
  );
};

/**
 * The page once the address has been read: the form with the Query in it,
 * and under it either the intro or the heading and the Matches. Reading the
 * address is a request-time read, so this sits behind the page's outer
 * boundary; the Matches sit behind an inner one of their own, because the
 * address answers at once and TMDB does not.
 */
const Asked = async ({
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
      <>
        <SearchForm query={query} />
        <h1 className='font-black text-3xl leading-[1.05]'>Search</h1>
        <p className='opacity-60'>
          Find a show or a movie by name. Everything here comes from TMDB.
        </p>
      </>
    );
  }

  const kind = firstValue(params.kind);

  return (
    <>
      <SearchForm query={query} />
      <h1 className='font-black text-3xl leading-[1.05]'>
        Matches for “{query}”
      </h1>
      <Suspense
        fallback={
          <>
            {/* real links with no counts yet; which tab is open is the
                address's say until what answered can decide */}
            <KindTabs query={query} selected={isKind(kind) ? kind : 'tv'} />
            {/* where "Showing the top 20 of…" will be, so the grid does not
                move down when it arrives */}
            <p className='text-sm opacity-60'>Searching TMDB</p>
            <MediaGridSkeleton />
          </>
        }
      >
        <MatchesFor query={query} kind={kind} />
      </Suspense>
    </>
  );
};

/**
 * The frame every state of this page shares — the back affordance, and the
 * column the rest streams into — written once here. The form without its
 * Query is the fallback: it is the same markup, and nothing the address
 * says changes what it does.
 */
const SearchPage = ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): JSX.Element => (
  <main className='flex-1 p-4'>
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 py-4'>
      <BackButton href='/' className='self-start'>
        Back to trending
      </BackButton>
      <Suspense fallback={<SearchForm />}>
        <Asked searchParams={searchParams} />
      </Suspense>
    </div>
  </main>
);

export default SearchPage;
