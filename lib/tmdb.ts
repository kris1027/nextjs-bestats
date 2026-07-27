export type Show = {
  id: number;
  name: string;
  poster_path: string;
  vote_average: number;
};

type TrendingResponse = {
  results: Show[];
};

export type Movie = {
  id: number;
  title: string;
  poster_path: string;
  vote_average: string;
};

const fetchTMDB = async <T>(path: string): Promise<T> => {
  const baseUrl = process.env.TMDB_API_URL;
  const token = process.env.TMDB_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('Missing TMDB_API_URL or TMDB_API_TOKEN');
  }

  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`TMDB server error: ${res.status}`);

  return res.json();
};

export const trendingShows = async (): Promise<Show[]> => {
  const data = await fetchTMDB<TrendingResponse>('/trending/tv/week');

  if (!data) throw new Error('Trending Shows data fetching fails');

  return data.results;
};
