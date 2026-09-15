import { afterEach, expect, test, vi } from 'vitest';

import {
  episodeAddress,
  episodeCode,
  episodeDetails,
  hasAired,
  hasEnded,
  isEpisodeNumber,
  isMediaId,
  isSeasonNumber,
  mediaAddress,
  openKind,
  releaseDate,
  seasonDetails,
  showEpisodes,
  showSeasons,
} from '@/lib/media';
import type { TmdbEpisode, TmdbSeason, TmdbSeasonSummary } from '@/lib/tmdb';

// TMDB stands in here: the requests are what is mocked, and the mapping into
// the glossary's shapes is what is tested. The image hosts come from the
// environment, which a commit has no copy of.
const tmdb = vi.hoisted(() => ({ findTMDB: vi.fn() }));

vi.mock('@/lib/tmdb', () => ({
  findTMDB: tmdb.findTMDB,
  fetchTMDB: vi.fn(),
  posterUrl: (path: string) => `poster${path}`,
  backdropUrl: (path: string) => `backdrop${path}`,
  stillUrl: (path: string) => `still${path}`,
}));

afterEach(() => {
  tmdb.findTMDB.mockReset();
});

test('isMediaId admits a positive integer', () => {
  expect(isMediaId('1')).toBe(true);
  expect(isMediaId('1399')).toBe(true);
  expect(isMediaId('999999999')).toBe(true);
});

test('isMediaId refuses what cannot be a TMDB id', () => {
  expect(isMediaId('')).toBe(false);
  expect(isMediaId('0')).toBe(false);
  expect(isMediaId('01')).toBe(false);
  expect(isMediaId('-1')).toBe(false);
  expect(isMediaId('1.5')).toBe(false);
  expect(isMediaId('1e3')).toBe(false);
  expect(isMediaId(' 1')).toBe(false);
  expect(isMediaId('1399abc')).toBe(false);
  expect(isMediaId('1000000000')).toBe(false);
});

test('openKind opens the Kind with something in it', () => {
  expect(openKind({ tv: true, movie: false })).toBe('tv');
  expect(openKind({ tv: false, movie: true })).toBe('movie');
});

test('openKind opens Shows where both have something and where neither does', () => {
  expect(openKind({ tv: true, movie: true })).toBe('tv');
  expect(openKind({ tv: false, movie: false })).toBe('tv');
});

test('isSeasonNumber admits specials and the seasons after them', () => {
  expect(isSeasonNumber('0')).toBe(true);
  expect(isSeasonNumber('1')).toBe(true);
  expect(isSeasonNumber('35')).toBe(true);
});

test('isSeasonNumber refuses what cannot be a season', () => {
  expect(isSeasonNumber('')).toBe(false);
  expect(isSeasonNumber('00')).toBe(false);
  expect(isSeasonNumber('01')).toBe(false);
  expect(isSeasonNumber('-1')).toBe(false);
  expect(isSeasonNumber('1.5')).toBe(false);
  expect(isSeasonNumber('10000')).toBe(false);
});

test('isEpisodeNumber counts from 1, specials included', () => {
  expect(isEpisodeNumber('1')).toBe(true);
  expect(isEpisodeNumber('2400')).toBe(true);
  expect(isEpisodeNumber('0')).toBe(false);
  expect(isEpisodeNumber('01')).toBe(false);
  expect(isEpisodeNumber('')).toBe(false);
});

test("mediaAddress is the detail page's address for either Kind", () => {
  expect(mediaAddress({ kind: 'tv', id: 95396 })).toBe('/tv/95396');
  expect(mediaAddress({ kind: 'movie', id: 550 })).toBe('/movie/550');
});

test('episodeAddress nests an Episode under its season', () => {
  expect(episodeAddress({ showId: 95396, season: 1, episode: 2 })).toBe(
    '/tv/95396/season/1/episode/2',
  );
});

const summary = (
  overrides: Partial<TmdbSeasonSummary> & { season_number: number },
): TmdbSeasonSummary => ({
  id: overrides.season_number + 100,
  name: `Season ${overrides.season_number}`,
  episode_count: 9,
  air_date: '2022-02-17',
  ...overrides,
});

const episode = (
  overrides: Partial<TmdbEpisode> & { episode_number: number },
): TmdbEpisode => ({
  id: overrides.episode_number + 1000,
  season_number: 1,
  name: `Episode ${overrides.episode_number}`,
  overview: '',
  air_date: '2022-02-17',
  runtime: 57,
  still_path: null,
  vote_average: 8.2,
  vote_count: 148,
  ...overrides,
});

const season = (overrides: Partial<TmdbSeason> = {}): TmdbSeason => ({
  id: 135726,
  season_number: 1,
  name: 'Season 1',
  overview: 'At Lumon Industries…',
  poster_path: '/season.jpg',
  air_date: '2022-02-17',
  episodes: [
    episode({ episode_number: 1, name: 'Good News About Hell' }),
    episode({ episode_number: 2, name: 'Half Loop', still_path: '/loop.jpg' }),
  ],
  ...overrides,
});

const show = { id: 95396, name: 'Severance', poster_path: '/show.jpg' };

test('showSeasons puts specials after the seasons that are in order', async () => {
  tmdb.findTMDB.mockResolvedValue({
    ...show,
    seasons: [
      summary({ season_number: 0, name: 'Specials' }),
      summary({ season_number: 1 }),
      summary({ season_number: 2 }),
    ],
  });

  const seasons = await showSeasons(95396);

  expect(seasons?.map((item) => item.label)).toEqual([
    'Season 1',
    'Season 2',
    'Specials',
  ]);
});

test('showSeasons states no count for a season that has not aired', async () => {
  tmdb.findTMDB.mockResolvedValue({
    ...show,
    seasons: [
      summary({ season_number: 1 }),
      summary({ season_number: 3, episode_count: 0, air_date: null }),
    ],
  });

  const seasons = await showSeasons(95396);

  expect(seasons?.[0]?.facts).toEqual(['February 17, 2022', '9 episodes']);
  expect(seasons?.[1]?.facts).toEqual([]);
});

test('showSeasons is null for a Show TMDB does not have', async () => {
  tmdb.findTMDB.mockResolvedValue(null);

  expect(await showSeasons(1)).toBeNull();
});

test('seasonDetails reads the Show and the season out of one request', async () => {
  tmdb.findTMDB.mockResolvedValue({ ...show, 'season/1': season() });

  const details = await seasonDetails(95396, 1);

  expect(tmdb.findTMDB).toHaveBeenCalledOnce();
  expect(tmdb.findTMDB).toHaveBeenCalledWith(
    '/tv/95396?append_to_response=season/1',
  );
  expect(details?.show).toEqual({ id: 95396, label: 'Severance' });
  expect(details?.posterUrl).toBe('poster/season.jpg');
  expect(details?.episodes.map((item) => item.label)).toEqual([
    'Good News About Hell',
    'Half Loop',
  ]);
});

test('seasonDetails says so for an Episode TMDB has no air date for', async () => {
  tmdb.findTMDB.mockResolvedValue({
    ...show,
    'season/1': season({
      episodes: [
        episode({ episode_number: 1 }),
        episode({ episode_number: 2, air_date: null }),
      ],
    }),
  });

  const details = await seasonDetails(95396, 1);

  expect(details?.episodes.map((item) => item.facts)).toEqual([
    ['February 17, 2022'],
    ['No air date announced'],
  ]);
});

test('seasonDetails is null for a season the Show does not have', async () => {
  // TMDB answers the Show and leaves the appended season out
  tmdb.findTMDB.mockResolvedValue({ ...show });

  expect(await seasonDetails(95396, 99)).toBeNull();
});

test('episodeDetails finds the Episode at its position in the season', async () => {
  tmdb.findTMDB.mockResolvedValue({ ...show, 'season/1': season() });

  const details = await episodeDetails({
    showId: 95396,
    season: 1,
    episode: 2,
  });

  expect(details).toMatchObject({
    show: { id: 95396, label: 'Severance' },
    season: { number: 1, label: 'Season 1' },
    number: 2,
    label: 'Half Loop',
    stillUrl: 'still/loop.jpg',
    facts: ['Air date: February 17, 2022', '57m'],
  });
});

test("episodeDetails falls back to the Show's poster", async () => {
  tmdb.findTMDB.mockResolvedValue({
    ...show,
    'season/1': season({ poster_path: null }),
  });

  const details = await episodeDetails({
    showId: 95396,
    season: 1,
    episode: 1,
  });

  expect(details?.posterUrl).toBe('poster/show.jpg');
});

test('episodeDetails says so when TMDB has no air date', async () => {
  tmdb.findTMDB.mockResolvedValue({
    ...show,
    'season/1': season({
      episodes: [episode({ episode_number: 1, air_date: null, runtime: null })],
    }),
  });

  const details = await episodeDetails({
    showId: 95396,
    season: 1,
    episode: 1,
  });

  expect(details?.facts).toEqual(['No air date announced']);
});

test('episodeDetails is null for a position the season does not have', async () => {
  tmdb.findTMDB.mockResolvedValue({ ...show, 'season/1': season() });

  expect(
    await episodeDetails({ showId: 95396, season: 1, episode: 99 }),
  ).toBeNull();
});

test("episodeDetails carries the Episode's own id and its air date as TMDB spells it", async () => {
  tmdb.findTMDB.mockResolvedValue({ ...show, 'season/1': season() });

  const details = await episodeDetails({
    showId: 95396,
    season: 1,
    episode: 2,
  });

  expect(details?.id).toBe(1002);
  expect(details?.airDate).toBe('2022-02-17');
});

test('episodeDetails reads an empty air date as none', async () => {
  tmdb.findTMDB.mockResolvedValue({
    ...show,
    'season/1': season({
      episodes: [episode({ episode_number: 1, air_date: '' })],
    }),
  });

  const details = await episodeDetails({
    showId: 95396,
    season: 1,
    episode: 1,
  });

  expect(details?.airDate).toBeNull();
});

const MIDDAY = new Date('2026-09-14T12:00:00Z');

test('hasAired counts an Episode that aired before today, and one that airs today', () => {
  expect(hasAired('2022-02-17', MIDDAY)).toBe(true);
  expect(hasAired('2026-09-13', MIDDAY)).toBe(true);
  expect(hasAired('2026-09-14', MIDDAY)).toBe(true);
});

test('hasAired refuses an Episode that airs tomorrow, or has no air date', () => {
  expect(hasAired('2026-09-15', MIDDAY)).toBe(false);
  expect(hasAired(null, MIDDAY)).toBe(false);
  expect(hasAired('not a date', MIDDAY)).toBe(false);
});

test('hasEnded is true for an Ended or a Canceled Show', () => {
  expect(hasEnded('Ended')).toBe(true);
  expect(hasEnded('Canceled')).toBe(true);
});

test('hasEnded is false for a Show still running, and for a status TMDB has not used before', () => {
  for (const status of [
    'Returning Series',
    'In Production',
    'Planned',
    'Pilot',
    'Cancelled',
    'Rebooted',
    '',
  ]) {
    expect(hasEnded(status)).toBe(false);
  }
});

test('episodeCode names an Episode by its season and number', () => {
  expect(episodeCode({ showId: 1396, season: 2, episode: 4 })).toBe('S2E4');
});

/** `/tv/{id}` listing these seasons, as `showEpisodes` first asks for it. */
const withSeasons = (numbers: number[], status = 'Returning Series') => ({
  ...show,
  status,
  seasons: numbers.map((season_number) => summary({ season_number })),
});

test("showEpisodes lists each season's Episode ids in order, Specials last where asked for", async () => {
  tmdb.findTMDB.mockImplementation(async (path: string) =>
    path === '/tv/95396'
      ? withSeasons([0, 2, 1])
      : {
          ...show,
          'season/0': season({
            season_number: 0,
            episodes: [episode({ episode_number: 1, id: 9001 })],
          }),
          'season/1': season({ season_number: 1 }),
          'season/2': season({
            season_number: 2,
            episodes: [episode({ episode_number: 1, id: 2001 })],
          }),
        },
  );

  expect(await showEpisodes(95396, { specials: true })).toEqual({
    ended: false,
    seasons: [
      {
        number: 1,
        episodes: [
          { id: 1001, number: 1, airDate: '2022-02-17' },
          { id: 1002, number: 2, airDate: '2022-02-17' },
        ],
      },
      { number: 2, episodes: [{ id: 2001, number: 1, airDate: '2022-02-17' }] },
      { number: 0, episodes: [{ id: 9001, number: 1, airDate: '2022-02-17' }] },
    ],
  });
  expect(tmdb.findTMDB).toHaveBeenCalledWith(
    '/tv/95396?append_to_response=season/1,season/2,season/0',
  );
});

test('showEpisodes leaves Specials out unless asked, and never waits on them', async () => {
  tmdb.findTMDB.mockImplementation(async (path: string) =>
    path === '/tv/95396'
      ? withSeasons([1, 0])
      : { ...show, 'season/1': season({ season_number: 1 }) },
  );

  // the lists place a Show by its regular seasons, so Specials TMDB did not
  // answer for cannot leave it Unanswered there
  expect(
    (await showEpisodes(95396))?.seasons.map(({ number }) => number),
  ).toEqual([1]);
  expect(tmdb.findTMDB).toHaveBeenCalledWith(
    '/tv/95396?append_to_response=season/1',
  );
});

test('showEpisodes throws when TMDB leaves out the Specials the Show lists', async () => {
  tmdb.findTMDB.mockImplementation(async (path: string) =>
    path === '/tv/95396'
      ? withSeasons([1, 0])
      : { ...show, 'season/1': season({ season_number: 1 }) },
  );

  // read as a Show with no Specials, every Special a Viewer scored would be
  // listed as Gone when TMDB only did not answer for them
  await expect(showEpisodes(95396, { specials: true })).rejects.toThrow(
    'TMDB left season 0 of tv/95396 unanswered',
  );
});

/** An `append_to_response` answer carrying every season the path asked for. */
const appended = (path: string) => ({
  ...show,
  ...Object.fromEntries(
    (path.split('append_to_response=')[1] ?? '')
      .split(',')
      .map((key) => [
        key,
        season({ season_number: Number(key.replace('season/', '')) }),
      ]),
  ),
});

test('showEpisodes asks for twenty seasons a request, the most TMDB appends', async () => {
  tmdb.findTMDB.mockImplementation(async (path: string) =>
    path === '/tv/95396'
      ? withSeasons(Array.from({ length: 21 }, (_, index) => index + 1))
      : appended(path),
  );

  await showEpisodes(95396);

  expect(tmdb.findTMDB).toHaveBeenCalledTimes(3);
  expect(tmdb.findTMDB).toHaveBeenLastCalledWith(
    '/tv/95396?append_to_response=season/21',
  );
});

test('showEpisodes reads an empty air date as none, and keeps an announced season', async () => {
  tmdb.findTMDB.mockImplementation(async (path: string) =>
    path === '/tv/95396'
      ? withSeasons([1, 2])
      : {
          ...show,
          'season/1': season({
            episodes: [episode({ episode_number: 1, air_date: '' })],
          }),
          'season/2': season({ season_number: 2, episodes: [] }),
        },
  );

  expect(await showEpisodes(95396)).toEqual({
    ended: false,
    seasons: [
      { number: 1, episodes: [{ id: 1001, number: 1, airDate: null }] },
      { number: 2, episodes: [] },
    ],
  });
});

test("showEpisodes says a Show has ended where TMDB's status does", async () => {
  tmdb.findTMDB.mockImplementation(async (path: string) =>
    path === '/tv/95396' ? withSeasons([1], 'Canceled') : appended(path),
  );

  expect((await showEpisodes(95396))?.ended).toBe(true);
});

test('showEpisodes says a Show has not ended where TMDB spells a status it has not used before', async () => {
  // `Cancelled` is not TMDB's spelling, so a Show wearing it is waited for
  tmdb.findTMDB.mockImplementation(async (path: string) =>
    path === '/tv/95396' ? withSeasons([1], 'Cancelled') : appended(path),
  );

  expect((await showEpisodes(95396))?.ended).toBe(false);
});

test('showEpisodes is null for a Show TMDB does not have', async () => {
  tmdb.findTMDB.mockResolvedValue(null);

  expect(await showEpisodes(95396)).toBe(null);
});

test('showEpisodes throws when TMDB leaves out a season the Show lists', async () => {
  tmdb.findTMDB.mockImplementation(async (path: string) =>
    path === '/tv/95396'
      ? withSeasons([1, 2])
      : { ...show, 'season/2': season({ season_number: 2 }) },
  );

  // counted from season 2 alone, a Viewer partway through season 1 would be
  // sent to S2E1 rather than the card owning that TMDB did not answer
  await expect(showEpisodes(95396)).rejects.toThrow(
    'TMDB left season 1 of tv/95396 unanswered',
  );
});

test("releaseDate is the Movie's release day as TMDB spells it", async () => {
  tmdb.findTMDB.mockResolvedValue({ release_date: '2026-11-20' });

  expect(await releaseDate(550)).toBe('2026-11-20');
  expect(tmdb.findTMDB).toHaveBeenCalledWith('/movie/550');
});

test('releaseDate is null for an empty date and for a Movie TMDB does not have', async () => {
  tmdb.findTMDB.mockResolvedValueOnce({ release_date: '' });
  tmdb.findTMDB.mockResolvedValueOnce(null);

  expect(await releaseDate(550)).toBe(null);
  expect(await releaseDate(550)).toBe(null);
});
