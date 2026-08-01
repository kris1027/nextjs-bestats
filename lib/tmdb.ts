export type Show = {
  id: number;
  name: string;
  poster_path: string | null;
  vote_average: number;
  media_type: 'tv';
};

export type ShowDetails = Show & {
  backdrop_path: string | null;
  first_air_date: string;
  number_of_episodes: number;
  number_of_seasons: number;
  overview: string;
  vote_count: number;
};

export type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  media_type: 'movie';
};

type TrendingResponse<T> = {
  results: T[];
};

export type MediaItem = {
  id: number;
  label: string;
  posterUrl: string | null;
  rating: number;
  type: string;
};

export type MediaDetails = {
  background: string | null;
  release: string;
  episodes: number;
  seasons: number;
  description: string;
  raters: number;
};

const fetchTMDB = async <T>(path: string): Promise<T> => {
  const baseUrl = process.env.TMDB_API_URL;
  const token = process.env.TMDB_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('Missing TMDB_API_URL or TMDB_API_TOKEN');
  }

  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);

  return res.json();
};

const trending = async <T>(kind: 'tv' | 'movie'): Promise<T[]> => {
  const data = await fetchTMDB<TrendingResponse<T>>(`/trending/${kind}/week`);

  if (!data.results) throw new Error(`Failed to fetch trending ${kind}`);

  return data.results;
};

export const showDetails = async <T>(id: number): Promise<T> => {
  const data = await fetchTMDB<T>(`/tv/${id}`);

  if (!data) throw new Error(`Failed to fetch show details for ${id}`);

  return data;
};

export const posterUrl = (path: string): string => {
  const base = process.env.TMDB_POSTER_PATH;

  if (!base) throw new Error('Missing TMDB_POSTER_PATH');

  return `${base}${path}`;
};

export const toMediaItem = (media: Show | Movie): MediaItem => ({
  id: media.id,
  label: media.media_type === 'movie' ? media.title : media.name,
  posterUrl: media.poster_path ? posterUrl(media.poster_path) : null,
  rating: media.vote_average,
  type: media.media_type,
});

export const toMediaDetails = (detailedMedia: ShowDetails): MediaDetails => ({
  background: detailedMedia.backdrop_path,
  release: detailedMedia.first_air_date,
  episodes: detailedMedia.number_of_episodes,
  seasons: detailedMedia.number_of_seasons,
  description: detailedMedia.overview,
  raters: detailedMedia.vote_count,
});

export const trendingShows = (): Promise<Show[]> => trending<Show>('tv');
export const trendingMovies = (): Promise<Movie[]> => trending<Movie>('movie');
