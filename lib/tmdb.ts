export type Show = {
  id: number;
  name: string;
  poster_path: string | null;
  vote_average: number;
  media_type: 'tv';
};

export type Movie = {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
  media_type: 'movie';
};

type TrendingShowResponse = {
  results: Show[];
};

type TrendingMovieResponse = {
  results: Movie[];
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

export const trendingShows = async (): Promise<Show[]> => {
  const data = await fetchTMDB<TrendingShowResponse>('/trending/tv/week');

  if (!data.results) throw new Error('Failed to fetch trending shows');

  return data.results;
};

export const trendingMovies = async (): Promise<Movie[]> => {
  const data = await fetchTMDB<TrendingMovieResponse>('/trending/movie/week');

  if (!data.results) throw new Error('Failed to fetch trending movies');

  return data.results;
};
