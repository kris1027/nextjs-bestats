import { cacheLife } from 'next/cache';

/**
 * TMDB's half of the app: what its endpoints return and how to reach them.
 * Everything here is spelled the way TMDB spells it — the glossary's words
 * begin in `lib/media.ts`, which maps these shapes into them.
 */

/**
 * A Show as the list endpoints report it. Trending and search describe a Show
 * differently — only trending declares `media_type` — but they agree on every
 * field a Media Item needs, so one type serves both.
 */
export type TmdbShow = {
  id: number;
  name: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
};

/** A Movie as the list endpoints report it. See `TmdbShow`. */
export type TmdbMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
};

/** A Show as `/tv/{id}` reports it. */
export type TmdbShowDetails = {
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

/** A Movie as `/movie/{id}` reports it. */
export type TmdbMovieDetails = {
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

export type TrendingResponse<T> = {
  results: T[];
};

/**
 * `total_results` counts everything TMDB matched, not what it returned — a
 * page holds 20 of them.
 */
export type SearchResponse<T> = {
  results: T[];
  total_results: number;
};

const request = async (path: string): Promise<Response> => {
  const baseUrl = process.env.TMDB_API_URL;
  const token = process.env.TMDB_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('Missing TMDB_API_URL or TMDB_API_TOKEN');
  }

  return fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

/**
 * The two fetchers below are cached by directive rather than by a fetch
 * option: under `cacheComponents` the option is superseded, and this is the
 * one module that knows a request is made at all. An hour, as the option
 * said. A thrown request never reaches the cache, so Unanswered stays a
 * per-request answer; a 404 does, and Gone Media stops being asked for.
 * — `docs/adr/0010-the-shell-is-prerendered.md`
 */
const TMDB_CACHE_LIFE = 'hours';

/**
 * For the endpoints the app builds itself, where every failure — a 404
 * included — means TMDB moved or the app is misconfigured.
 */
export const fetchTMDB = async <T>(path: string): Promise<T> => {
  'use cache';
  cacheLife(TMDB_CACHE_LIFE);

  const res = await request(path);

  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);

  return res.json();
};

/**
 * For the endpoints an address bar can reach, where a 404 only means nobody
 * is there. Every other failure still throws, so a 500 keeps meaning
 * something is genuinely broken rather than that someone mistyped a URL.
 */
export const findTMDB = async <T>(path: string): Promise<T | null> => {
  'use cache';
  cacheLife(TMDB_CACHE_LIFE);

  const res = await request(path);

  if (res.status === 404) return null;

  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);

  return res.json();
};

const imageUrl = (artwork: 'poster' | 'backdrop', path: string): string => {
  const base =
    artwork === 'poster'
      ? process.env.TMDB_POSTER_PATH
      : process.env.TMDB_BACKDROP_PATH;

  if (!base) throw new Error(`Missing TMDB_${artwork.toUpperCase()}_PATH`);

  return `${base}${path}`;
};

export const posterUrl = (path: string): string => imageUrl('poster', path);
export const backdropUrl = (path: string): string => imageUrl('backdrop', path);
