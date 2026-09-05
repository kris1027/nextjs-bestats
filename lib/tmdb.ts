import { formatAirDate, formatCount, formatRuntime } from '@/lib/format';

export type MediaType = 'tv' | 'movie';

export type ImageKind = 'poster' | 'backdrop';

export type ShowCard = {
  id: number;
  name: string;
  poster_path: string | null;
  vote_average: number;
  media_type: 'tv';
};

export type MovieCard = {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  media_type: 'movie';
};

export type ShowDetails = {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  first_air_date: string;
  number_of_episodes: number;
  number_of_seasons: number;
  overview: string;
};

export type MovieDetails = {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date: string;
  runtime: number | null;
  overview: string;
};

type TrendingResponse<T> = {
  results: T[];
};

/** What a card renders. */
export type MediaItem = {
  id: number;
  label: string;
  posterUrl: string | null;
  rating: number;
  mediaType: MediaType;
};

/**
 * What a detail page renders. Shows and movies differ only in their facts,
 * which arrive already formatted — so the page never learns which kind it is
 * looking at, and this module stays the only one that knows `tv` means shows.
 */
export type MediaDetails = {
  label: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  voteCount: number;
  overview: string;
  facts: string[];
};

/**
 * Resolves to `null` only when TMDB has no such resource. Every other failure
 * throws, so a 500 keeps meaning something is genuinely broken rather than
 * that someone mistyped a URL.
 */
const fetchTMDB = async <T>(path: string): Promise<T | null> => {
  const baseUrl = process.env.TMDB_API_URL;
  const token = process.env.TMDB_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('Missing TMDB_API_URL or TMDB_API_TOKEN');
  }

  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  if (res.status === 404) return null;

  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);

  return res.json();
};

const trending = async <T>(kind: MediaType): Promise<T[]> => {
  const data = await fetchTMDB<TrendingResponse<T>>(`/trending/${kind}/week`);

  if (!data?.results) throw new Error(`Failed to fetch trending ${kind}`);

  return data.results;
};

const imageUrl = (kind: ImageKind, path: string): string => {
  const base =
    kind === 'poster'
      ? process.env.TMDB_POSTER_PATH
      : process.env.TMDB_BACKDROP_PATH;

  if (!base) throw new Error(`Missing TMDB_${kind.toUpperCase()}_PATH`);

  return `${base}${path}`;
};

export const posterUrl = (path: string): string => imageUrl('poster', path);
export const backdropUrl = (path: string): string => imageUrl('backdrop', path);

/** A fact TMDB has no value for is left out rather than rendered blank. */
const toFacts = (...entries: (string | null)[]): string[] =>
  entries.filter((entry) => entry !== null);

const toShowDetails = (show: ShowDetails): MediaDetails => {
  const airDate = formatAirDate(show.first_air_date);

  return {
    label: show.name,
    posterUrl: show.poster_path ? posterUrl(show.poster_path) : null,
    backdropUrl: show.backdrop_path ? backdropUrl(show.backdrop_path) : null,
    rating: show.vote_average,
    voteCount: show.vote_count,
    overview: show.overview,
    facts: toFacts(
      airDate && `First aired: ${airDate}`,
      formatCount(show.number_of_seasons, { one: 'season', other: 'seasons' }),
      formatCount(show.number_of_episodes, {
        one: 'episode',
        other: 'episodes',
      }),
    ),
  };
};

const toMovieDetails = (movie: MovieDetails): MediaDetails => {
  const releaseDate = formatAirDate(movie.release_date);

  return {
    label: movie.title,
    posterUrl: movie.poster_path ? posterUrl(movie.poster_path) : null,
    backdropUrl: movie.backdrop_path ? backdropUrl(movie.backdrop_path) : null,
    rating: movie.vote_average,
    voteCount: movie.vote_count,
    overview: movie.overview,
    facts: toFacts(
      releaseDate && `Released: ${releaseDate}`,
      formatRuntime(movie.runtime),
    ),
  };
};

export const toMediaItem = (media: ShowCard | MovieCard): MediaItem => ({
  id: media.id,
  label: media.media_type === 'movie' ? media.title : media.name,
  posterUrl: media.poster_path ? posterUrl(media.poster_path) : null,
  rating: media.vote_average,
  mediaType: media.media_type,
});

export const trendingShows = (): Promise<ShowCard[]> =>
  trending<ShowCard>('tv');
export const trendingMovies = (): Promise<MovieCard[]> =>
  trending<MovieCard>('movie');

/** Guards the `mediaType` route segment, which arrives as an opaque string. */
export const isMediaType = (value: string): value is MediaType =>
  value === 'tv' || value === 'movie';

/**
 * The detail endpoints, unlike the trending ones, return no `media_type` — so
 * the kind is the caller's to supply rather than the payload's to declare.
 */
export const mediaDetails = async (
  kind: MediaType,
  id: number,
): Promise<MediaDetails | null> => {
  if (kind === 'tv') {
    const show = await fetchTMDB<ShowDetails>(`/tv/${id}`);

    return show && toShowDetails(show);
  }

  const movie = await fetchTMDB<MovieDetails>(`/movie/${id}`);

  return movie && toMovieDetails(movie);
};
