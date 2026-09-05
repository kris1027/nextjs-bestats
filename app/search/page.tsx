import type { Metadata } from 'next';
import type { JSX, ReactNode } from 'react';

import { MediaList } from '@/components/media/media-list';
import { KindTabs } from '@/components/search/kind-tabs';
import { SearchForm } from '@/components/search/search-form';
import { BackButton } from '@/components/ui/back-button';
import { formatTally } from '@/lib/format';
import { isKind, type Kind, searchMovies, searchShows } from '@/lib/media';

type SearchParams = { [key: string]: string | string[] | undefined };

const NOUNS: Record<Kind, { one: string; other: string }> = {
  tv: { one: 'show', other: 'shows' },
  movie: { one: 'movie', other: 'movies' },
};

/** A query parameter can repeat — `?q=a&q=b` — so the first one wins. */
const firstValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? '';

/** Every state of this page is the form plus something; this is the plus. */
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

  const [shows, movies] = await Promise.all([
    searchShows(query),
    searchMovies(query),
  ]);

  const heading = (
    <h1 className='font-black text-3xl leading-[1.05]'>
      Matches for “{query}”
    </h1>
  );

  // Both Kinds are empty, so tabs would be two empty panels. This is still a
  // 200: there is a search box at this address, which is what the visitor
  // needs next.
  if (!shows.items.length && !movies.items.length) {
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
  const selected: Kind = isKind(kind)
    ? kind
    : shows.items.length > 0
      ? 'tv'
      : 'movie';
  const matches = selected === 'tv' ? shows : movies;

  return (
    <Shell query={query}>
      {heading}
      <KindTabs query={query} selected={selected} />
      {matches.items.length > 0 ? (
        <>
          <p className='text-sm opacity-60'>
            Showing{' '}
            {formatTally(matches.items.length, matches.total, NOUNS[selected])}
          </p>
          <MediaList media={matches.items} />
        </>
      ) : (
        <p className='opacity-60'>
          No {NOUNS[selected].other} match “{query}”.
        </p>
      )}
    </Shell>
  );
};

export default SearchPage;
