import {
  formatCount,
  formatDate,
  formatRuntime,
  type NounForms,
} from '@/lib/format';
import {
  backdropUrl,
  fetchTMDB,
  findTMDB,
  posterUrl,
  type SearchResponse,
  stillUrl,
  type TmdbEpisode,
  type TmdbMovie,
  type TmdbMovieDetails,
  type TmdbSeason,
  type TmdbSeasonSummary,
  type TmdbShow,
  type TmdbShowDetails,
  type TmdbShowWithSeason,
  type TrendingResponse,
} from '@/lib/tmdb';

/**
 * The two Kinds, in the order a visitor meets them. `Kind` is read off this
 * list rather than declared beside it, so a Kind cannot exist without a place
 * in the order — or without its words below.
 */
export const KINDS = ['tv', 'movie'] as const;

/** Which of the two a piece of Media is. */
export type Kind = (typeof KINDS)[number];

/**
 * The words a visitor sees for a Kind: the label a tab wears, and the two
 * cases of the noun a sentence needs. Three spellings of one word, so they
 * are one row rather than three tables that can drift apart.
 *
 * A row is `NounForms` with the label added, rather than the forms nested
 * under it, so a caller that has a row can hand the whole thing to the count
 * formatters.
 *
 * They live here, beside the Kinds themselves, because "Show" is the word the
 * glossary gives the reader for `tv` — and because the page and the tabs both
 * need them, and `lib/media` is the one module both may read.
 */
export const KIND_WORDS: Record<Kind, NounForms & { label: string }> = {
  tv: { label: 'Shows', one: 'show', other: 'shows' },
  movie: { label: 'Movies', one: 'movie', other: 'movies' },
};

export type Artwork = 'poster' | 'backdrop';

/**
 * How a caller names one piece of Media: its Kind and its TMDB id, together,
 * because a TMDB id is unique only within a Kind. A Media Item already is
 * one, which is why a card can hand itself to anything that takes a ref.
 */
export type MediaRef = { kind: Kind; id: number };

/**
 * TMDB's average score for a piece of Media and the votes behind it. One type
 * because the count never reaches a screen on its own: it is the guard, and
 * nobody having voted is the only thing that distinguishes an unrated piece
 * of Media from one TMDB scores at zero.
 * — `docs/adr/0002-placeholder-facts-are-not-facts.md`
 */
export type Rating = { rating: number; voteCount: number };

/**
 * Enough of a piece of Media to recognise it in a grid and follow it to its
 * page, the Rating included — which is why a card can hand itself straight to
 * anything that draws one.
 */
export type MediaItem = Rating & {
  id: number;
  label: string;
  posterUrl: string | null;
  kind: Kind;
};

/**
 * What asking TMDB for one piece of Media by ref comes back as. Three answers,
 * because there are two ways not to get a Media Item and they mean different
 * things: Gone is TMDB's answer — it had this Media once and no longer does —
 * and Unanswered is no answer at all, which may be different next time. A
 * discriminant rather than `null` and `undefined`, so no reader has to
 * remember which absence is which.
 */
export type MediaAnswer =
  | { answer: 'item'; item: MediaItem }
  | { answer: Absence };

/**
 * The two ways a ref comes back without a Media Item. Named on its own so a
 * card that renders an absence can say it takes one, rather than spelling
 * out "any answer but the item" each time.
 */
export type Absence = 'gone' | 'unanswered';

/**
 * What a Query finds for one Kind. `total` counts everything TMDB matched,
 * so it is usually larger than `items` — only the first page is fetched.
 */
export type Matches = {
  items: MediaItem[];
  total: number;
};

/**
 * What a Query found, one entry per Kind. A Kind is `null` when its request
 * went unanswered — TMDB failed — which is not the same as Matches with
 * nothing in them, and the page says so rather than reporting a failure as an
 * absence.
 */
export type Search = Record<Kind, Matches | null>;

/**
 * What TMDB reports as Trending, one list per Kind. A Kind is `null` when its
 * request went unanswered, the same distinction `Search` draws: the home page
 * says so behind that tab and renders the other, rather than going down with
 * the search form on it.
 */
export type Trending = Record<Kind, MediaItem[] | null>;

/**
 * What a detail page renders. Shows and movies differ only in their facts,
 * which arrive already formatted — so the page never learns which kind it is
 * looking at, and this module stays the only one that knows `tv` means shows.
 */
export type MediaDetails = Rating & {
  label: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  facts: string[];
};

/**
 * Where an Episode sits in its Show: the season, and its number within it.
 * This is how an address names an Episode and not how anything else should:
 * TMDB renumbers Episodes, so a position is only good for finding one now.
 * — `docs/adr/0020-an-episode-record-is-keyed-on-its-tmdb-id.md`
 */
export type EpisodeRef = { showId: number; season: number; episode: number };

/** A Show as a season or an Episode page names it: enough to link back. */
export type ShowName = { id: number; label: string };

/**
 * A season as a Show's page lists it, or an Episode as its season's page
 * does: its number, its name and its Facts, formatted and possibly none, the
 * way a detail page's are. One type because the two lists are one shape. Not
 * an Item: a Media Item is what a card shows, and neither is Media on a card.
 */
export type Listing = { number: number; label: string; facts: string[] };

/** What a season's page renders: the season, and its Episodes in order. */
export type SeasonDetails = {
  show: ShowName;
  number: number;
  label: string;
  posterUrl: string | null;
  overview: string;
  episodes: Listing[];
};

/**
 * What an Episode's page renders. The poster is the season's, or the Show's
 * where the season has none, since an Episode has no poster of its own; the
 * still is the Episode's and stands where a backdrop would.
 */
export type EpisodeDetails = Rating & {
  show: ShowName;
  season: { number: number; label: string };
  number: number;
  label: string;
  posterUrl: string | null;
  stillUrl: string | null;
  overview: string;
  facts: string[];
};

/** Guards the `kind` route segment, which arrives as an opaque string. */
export const isKind = (value: string): value is Kind =>
  KINDS.some((kind) => kind === value);

/**
 * Which Kind opens where an address names none: the one with something in it,
 * and Shows where both have something or neither does. Said here once because
 * both tab rows that read an address follow it — `/search` and the two lists
 * — so a Kind with something behind its tab is never left behind a closed
 * one, whether that something is a Match or a Watch Record. What counts as
 * something is the caller's: Matches it can render, records it holds.
 * — `docs/adr/0004-search-is-two-searches.md`
 */
export const openKind = (has: Record<Kind, boolean>): Kind =>
  has.movie && !has.tv ? 'movie' : 'tv';

// TMDB ids are positive integers, so anything else cannot exist
const ID_PATTERN = /^[1-9]\d{0,8}$/;

/**
 * Guards a TMDB id that arrives as an opaque string — a route segment, a form
 * field. Said here once so the detail page and the marking action agree on
 * what cannot exist before either makes a request or a query.
 */
export const isMediaId = (value: string): boolean => ID_PATTERN.test(value);

// season 0 is TMDB's specials, so a season may be 0 where an id may not
const SEASON_PATTERN = /^(0|[1-9]\d{0,3})$/;
const EPISODE_PATTERN = /^[1-9]\d{0,4}$/;

/** Guards the `season` route segment. */
export const isSeasonNumber = (value: string): boolean =>
  SEASON_PATTERN.test(value);

/** Guards the `episode` route segment; specials count from 1 as well. */
export const isEpisodeNumber = (value: string): boolean =>
  EPISODE_PATTERN.test(value);

/** Where a piece of Media's detail page is. */
export const mediaAddress = ({ kind, id }: MediaRef): string =>
  `/${kind}/${id}`;

/** Where a season's page is. */
export const seasonAddress = (showId: number, season: number): string =>
  `${mediaAddress({ kind: 'tv', id: showId })}/season/${season}`;

/** Where an Episode's page is. */
export const episodeAddress = ({
  showId,
  season,
  episode,
}: EpisodeRef): string => `${seasonAddress(showId, season)}/episode/${episode}`;

/**
 * Whether a Kind has Media to put on a page. Not the same question as whether
 * its entry is present: `null` and empty `items` both leave nothing to render,
 * so a caller choosing what to show has to fold the two together.
 */
export const hasMatches = (matches: Matches | null): boolean =>
  matches !== null && matches.items.length > 0;

/**
 * Whether a Kind answered and matched nothing — TMDB's "no such Media", which
 * is the one absence the app may report as an absence. Said here beside its
 * opposite because the distinction from an unanswered Kind is this module's to
 * keep, and spelled out at a call site it is four clauses that have to be read
 * twice.
 */
export const matchedNothing = (matches: Matches | null): boolean =>
  matches !== null && matches.items.length === 0;

/** A fact TMDB has no value for is left out rather than rendered blank. */
const toFacts = (...entries: (string | null)[]): string[] =>
  entries.filter((entry) => entry !== null);

/**
 * Which wire shape a list endpoint reports for each Kind. Keyed by Kind rather
 * than left as a free type parameter, so a `tv` request cannot be read back as
 * a Movie.
 */
type TmdbMediaByKind = { tv: TmdbShow; movie: TmdbMovie };

/**
 * TMDB spells a piece of Media's name `name` on a Show and `title` on a Movie.
 * That is the only thing this mapping does differently per Kind, so it is said
 * here once and nowhere else. The Kind itself is the caller's to supply: of
 * the list endpoints only Trending declares it.
 */
const toMediaItem = (media: TmdbShow | TmdbMovie, kind: Kind): MediaItem => ({
  id: media.id,
  label: 'name' in media ? media.name : media.title,
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

const trending = async <K extends Kind>(kind: K): Promise<MediaItem[]> => {
  const path = `/trending/${kind}/week`;
  const data = await fetchTMDB<TrendingResponse<TmdbMediaByKind[K]>>(path);

  if (!data.results) throw new Error(`TMDB returned no results for ${path}`);

  return data.results.map((media) => toMediaItem(media, kind));
};

/**
 * Trending for both Kinds, issued together and settled apart the way
 * `searchMedia` settles a Query: one Kind failing leaves the other's list
 * intact.
 */
export const trendingMedia = async (): Promise<Trending> => {
  const [shows, movies] = await Promise.allSettled([
    trending('tv'),
    trending('movie'),
  ]);

  return {
    tv: answered(shows, 'trending for tv'),
    movie: answered(movies, 'trending for movie'),
  };
};

/**
 * The detail endpoints, unlike the trending ones, return no `media_type` — so
 * the Kind is the caller's to supply rather than the payload's to declare,
 * and a ref carries it. Which wire shape comes back follows the Kind, so this
 * is the one place the two endpoints are told apart; `null` is TMDB's 404.
 */
const findMedia = (
  ref: MediaRef,
): Promise<TmdbShowDetails | TmdbMovieDetails | null> =>
  ref.kind === 'tv'
    ? findTMDB<TmdbShowDetails>(`/tv/${ref.id}`)
    : findTMDB<TmdbMovieDetails>(`/movie/${ref.id}`);

/**
 * What a detail page renders for one piece of Media. Which mapping applies
 * follows the Kind the ref carries, not the payload, since the payload does
 * not say.
 */
export const mediaDetails = async (
  kind: Kind,
  id: number,
): Promise<MediaDetails | null> => {
  const media = await findMedia({ kind, id });

  if (!media) return null;

  return 'name' in media ? toShowDetails(media) : toMovieDetails(media);
};

/**
 * A season's Facts on a Show's page. The count waits on an air date for the
 * reason `toShowDetails` does: a season TMDB has only announced carries a
 * count that is not yet a finished statement.
 * — `docs/adr/0002-placeholder-facts-are-not-facts.md`
 */
const toSeasonListing = (season: TmdbSeasonSummary): Listing => {
  const aired = season.air_date ? formatDate(season.air_date) : null;

  return {
    number: season.season_number,
    label: season.name,
    facts: aired
      ? toFacts(
          aired,
          formatCount(season.episode_count, {
            one: 'episode',
            other: 'episodes',
          }),
        )
      : [],
  };
};

/** An Episode's air date, where TMDB has one. */
const airDate = (episode: TmdbEpisode): string | null =>
  episode.air_date ? formatDate(episode.air_date) : null;

// Unlike an absent Fact, an absent air date is stated: an Episode without one
// cannot be scored, and a page that left the date out would not say why.
// — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
const NO_AIR_DATE = 'No air date announced';

const toEpisodeListing = (episode: TmdbEpisode): Listing => ({
  number: episode.episode_number,
  label: episode.name,
  facts: toFacts(airDate(episode) ?? NO_AIR_DATE),
});

// specials are in no viewing order, so they follow the seasons that are
const bySeasonOrder = (a: Listing, b: Listing): number =>
  (a.number === 0 ? 1 : 0) - (b.number === 0 ? 1 : 0) || a.number - b.number;

/**
 * A Show's seasons, specials last, or `null` when TMDB has no such Show. The
 * same request the Show's detail page already made, so it costs nothing more.
 */
export const showSeasons = async (id: number): Promise<Listing[] | null> => {
  const show = await findTMDB<TmdbShowDetails>(`/tv/${id}`);

  if (!show) return null;

  return show.seasons.map(toSeasonListing).sort(bySeasonOrder);
};

/**
 * The Show and one of its seasons, in one request. `null` is TMDB's 404 for
 * the Show or its silence about the season, which is the same answer to an
 * address: nobody is there. A season page and every Episode page in it read
 * this one path, so they share its cache.
 */
const findSeason = async (
  showId: number,
  number: number,
): Promise<{
  show: ShowName;
  season: TmdbSeason;
  poster: string | null;
} | null> => {
  const found = await findTMDB<TmdbShowWithSeason>(
    `/tv/${showId}?append_to_response=season/${number}`,
  );
  const season = found?.[`season/${number}`];

  if (!found || !season) return null;

  return {
    show: { id: found.id, label: found.name },
    season,
    poster: season.poster_path ?? found.poster_path,
  };
};

/** What a season's page renders, or `null` when there is no such season. */
export const seasonDetails = async (
  showId: number,
  number: number,
): Promise<SeasonDetails | null> => {
  const found = await findSeason(showId, number);

  if (!found) return null;

  const { show, season, poster } = found;

  return {
    show,
    number: season.season_number,
    label: season.name,
    posterUrl: poster ? posterUrl(poster) : null,
    overview: season.overview,
    episodes: season.episodes.map(toEpisodeListing),
  };
};

/**
 * What an Episode's page renders, or `null` when TMDB lists no Episode at
 * that position. Read out of its season rather than from the Episode's own
 * endpoint, which says nothing of the Show or the season it belongs to.
 */
export const episodeDetails = async (
  ref: EpisodeRef,
): Promise<EpisodeDetails | null> => {
  const found = await findSeason(ref.showId, ref.season);
  const episode = found?.season.episodes.find(
    (candidate) => candidate.episode_number === ref.episode,
  );

  if (!found || !episode) return null;

  const { show, season, poster } = found;
  const aired = airDate(episode);

  return {
    show,
    season: { number: season.season_number, label: season.name },
    number: episode.episode_number,
    label: episode.name,
    posterUrl: poster ? posterUrl(poster) : null,
    stillUrl: episode.still_path ? stillUrl(episode.still_path) : null,
    rating: episode.vote_average,
    voteCount: episode.vote_count,
    overview: episode.overview,
    facts: toFacts(
      aired ? `Air date: ${aired}` : NO_AIR_DATE,
      formatRuntime(episode.runtime),
    ),
  };
};

/**
 * Where an Unanswered request's reason goes. Nothing downstream carries it:
 * a page can say a Kind or a ref went Unanswered, but only the server log can
 * say why. Said once here for the two places a settled request is read.
 */
const logUnanswered = (what: string, reason: unknown): void => {
  console.error(`TMDB ${what} went Unanswered:`, reason);
};

/**
 * A rejected request becomes `null` — an Unanswered Kind — rather than an
 * empty answer, because TMDB failing and TMDB answering with nothing are
 * different answers and the page has to be able to tell them apart. `what`
 * is for the log, which is the only place the reason goes.
 */
const answered = <T>(
  result: PromiseSettledResult<T>,
  what: string,
): T | null => {
  if (result.status === 'fulfilled') return result.value;

  logUnanswered(what, result.reason);

  return null;
};

/**
 * Resolves refs to Media Items, one request each, issued together and settled
 * apart the way `searchMedia` settles its two Kinds: one ref TMDB will not
 * answer for leaves the others' answers intact. The detail endpoints carry
 * every field a Media Item needs, so the list mapping serves. Answers come
 * back in the refs' order, so a caller pairs them by index.
 *
 * This is what a list of Watch Records costs, since a record stores nothing
 * from TMDB — which is why lists page at twenty.
 * — `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
 */
export const mediaItems = async (
  refs: readonly MediaRef[],
): Promise<MediaAnswer[]> => {
  const results = await Promise.allSettled(refs.map(findMedia));

  return results.map((result, index) => {
    const ref = refs[index];

    // one result per ref, so `ref` is always there; this is for the type
    if (!ref) return { answer: 'unanswered' };

    if (result.status === 'rejected') {
      logUnanswered(`${ref.kind}/${ref.id}`, result.reason);

      return { answer: 'unanswered' };
    }

    return result.value
      ? { answer: 'item', item: toMediaItem(result.value, ref.kind) }
      : { answer: 'gone' };
  });
};

/** Runs the Query against one Kind's endpoint. */
const searchKind = async <K extends Kind>(
  kind: K,
  query: string,
): Promise<Matches> => {
  // TMDB answers a query it cannot match with an empty page, never a 404, so
  // any failure here means the endpoint moved rather than that nobody matched.
  const path = `/search/${kind}?query=${encodeURIComponent(query)}`;
  const data = await fetchTMDB<SearchResponse<TmdbMediaByKind[K]>>(path);

  if (!data.results) throw new Error(`TMDB returned no results for ${path}`);

  return {
    items: data.results.map((media) => toMediaItem(media, kind)),
    total: data.total_results,
  };
};

/**
 * Runs the Query against both Kinds. The two are separate requests that need
 * nothing from each other, so they are issued together and settled apart: one
 * Kind failing leaves the other's Matches intact.
 * — `docs/adr/0004-search-is-two-searches.md`
 */
export const searchMedia = async (query: string): Promise<Search> => {
  const [shows, movies] = await Promise.allSettled([
    searchKind('tv', query),
    searchKind('movie', query),
  ]);

  return {
    tv: answered(shows, 'search for tv'),
    movie: answered(movies, 'search for movie'),
  };
};
