import { formatCount, formatDate, formatRuntime } from '@/lib/format';
import {
  backdropUrl,
  fetchTMDB,
  findTMDB,
  posterUrl,
  type TmdbMovie,
  type TmdbMovieDetails,
  type TmdbShow,
  type TmdbShowDetails,
  type TrendingResponse,
} from '@/lib/tmdb';

export type Kind = 'tv' | 'movie';

export type Artwork = 'poster' | 'backdrop';

/**
 * What a card renders. `voteCount` is carried for the guard rather than the
 * screen: nobody having voted is the only thing that distinguishes an unrated
 * piece of Media from one TMDB scores at zero.
 */
export type MediaItem = {
  id: number;
  label: string;
  posterUrl: string | null;
  rating: number;
  voteCount: number;
  kind: Kind;
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

/** Guards the `kind` route segment, which arrives as an opaque string. */
export const isKind = (value: string): value is Kind =>
  value === 'tv' || value === 'movie';

/** A fact TMDB has no value for is left out rather than rendered blank. */
const toFacts = (...entries: (string | null)[]): string[] =>
  entries.filter((entry) => entry !== null);

const toMediaItem = (
  media: TmdbShow | TmdbMovie,
  label: string,
  kind: Kind,
): MediaItem => ({
  id: media.id,
  label,
  posterUrl: media.poster_path ? posterUrl(media.poster_path) : null,
  rating: media.vote_average,
  voteCount: media.vote_count,
  kind,
});

const toMediaDetails = (
  media: TmdbShowDetails | TmdbMovieDetails,
  label: string,
  facts: string[],
): MediaDetails => ({
  label,
  posterUrl: media.poster_path ? posterUrl(media.poster_path) : null,
  backdropUrl: media.backdrop_path ? backdropUrl(media.backdrop_path) : null,
  rating: media.vote_average,
  voteCount: media.vote_count,
  overview: media.overview,
  facts,
});

const toShowDetails = (show: TmdbShowDetails): MediaDetails => {
  const aired = formatDate(show.first_air_date);

  return toMediaDetails(
    show,
    show.name,
    // TMDB reports one season and one episode for shows that have never
    // aired, so a count only becomes a finished statement once there is an
    // air date to anchor it. Do not drop this guard: the placeholder is a 1,
    // not a 0, and no falsy check will catch it.
    aired
      ? toFacts(
          `First aired: ${aired}`,
          formatCount(show.number_of_seasons, {
            one: 'season',
            other: 'seasons',
          }),
          formatCount(show.number_of_episodes, {
            one: 'episode',
            other: 'episodes',
          }),
        )
      : [],
  );
};

const toMovieDetails = (movie: TmdbMovieDetails): MediaDetails => {
  const released = formatDate(movie.release_date);

  return toMediaDetails(
    movie,
    movie.title,
    toFacts(released && `Released: ${released}`, formatRuntime(movie.runtime)),
  );
};

const trending = async <T>(kind: Kind): Promise<T[]> => {
  const path = `/trending/${kind}/week`;
  const data = await fetchTMDB<TrendingResponse<T>>(path);

  if (!data.results) throw new Error(`TMDB returned no results for ${path}`);

  return data.results;
};

export const trendingShows = async (): Promise<MediaItem[]> => {
  const shows = await trending<TmdbShow>('tv');

  return shows.map((show) => toMediaItem(show, show.name, 'tv'));
};

export const trendingMovies = async (): Promise<MediaItem[]> => {
  const movies = await trending<TmdbMovie>('movie');

  return movies.map((movie) => toMediaItem(movie, movie.title, 'movie'));
};

/**
 * The detail endpoints, unlike the trending ones, return no `media_type` — so
 * the kind is the caller's to supply rather than the payload's to declare.
 */
export const mediaDetails = async (
  kind: Kind,
  id: number,
): Promise<MediaDetails | null> => {
  if (kind === 'tv') {
    const show = await findTMDB<TmdbShowDetails>(`/tv/${id}`);

    return show && toShowDetails(show);
  }

  const movie = await findTMDB<TmdbMovieDetails>(`/movie/${id}`);

  return movie && toMovieDetails(movie);
};
