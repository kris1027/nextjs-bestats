export type MediaType = 'tv' | 'movie';

export type Show = {
  id: number;
  name: string;
  poster_path: string | null;
  vote_average: number;
  media_type: 'tv';
};

export type ShowDetails = Omit<Show, 'media_type'> & {
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
  mediaType: MediaType;
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

const trending = async <T>(kind: MediaType): Promise<T[]> => {
  const data = await fetchTMDB<TrendingResponse<T>>(`/trending/${kind}/week`);

  if (!data.results) throw new Error(`Failed to fetch trending ${kind}`);

  return data.results;
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
  mediaType: media.media_type,
});

export const trendingShows = (): Promise<Show[]> => trending<Show>('tv');
export const trendingMovies = (): Promise<Movie[]> => trending<Movie>('movie');

export const showDetails = (id: number): Promise<ShowDetails> =>
  fetchTMDB<ShowDetails>(`/tv/${id}`);
