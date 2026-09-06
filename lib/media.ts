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
  type TmdbMovie,
  type TmdbMovieDetails,
  type TmdbShow,
  type TmdbShowDetails,
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
 * Enough of a piece of Media to recognise it in a grid and follow it to its
 * page. `voteCount` is carried for the guard rather than the screen: nobody
 * having voted is the only thing that distinguishes an unrated piece of Media
 * from one TMDB scores at zero.
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
 * What asking TMDB for one piece of Media by ref comes back as. Three answers,
 * because there are two ways not to get a Media Item and they mean different
 * things: Gone is TMDB's answer — it had this Media once and no longer does —
 * and Unanswered is no answer at all, which may be different next time. A
 * discriminant rather than `null` and `undefined`, so no reader has to
 * remember which absence is which.
 */
export type MediaAnswer =
  | { answer: 'item'; item: MediaItem }
  | { answer: 'gone' }
  | { answer: 'unanswered' };

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
  KINDS.some((kind) => kind === value);

// TMDB ids are positive integers, so anything else cannot exist
const ID_PATTERN = /^[1-9]\d{0,8}$/;

/**
 * Guards a TMDB id that arrives as an opaque string — a route segment, a form
 * field. Said here once so the detail page and the marking action agree on
 * what cannot exist before either makes a request or a query.
 */
export const isMediaId = (value: string): boolean => ID_PATTERN.test(value);

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

export const trendingShows = (): Promise<MediaItem[]> => trending('tv');

export const trendingMovies = (): Promise<MediaItem[]> => trending('movie');

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
 * Where an Unanswered request's reason goes. Nothing downstream carries it:
 * a page can say a Kind or a ref went Unanswered, but only the server log can
 * say why. Said once here for the two places a settled request is read.
 */
const logUnanswered = (what: string, reason: unknown): void => {
  console.error(`TMDB ${what} went Unanswered:`, reason);
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
 * A rejected search becomes `null` — an Unanswered Kind — rather than empty
 * Matches, because TMDB failing and TMDB matching nothing are different
 * answers and the page has to be able to tell them apart.
 */
const answered = (
  result: PromiseSettledResult<Matches>,
  kind: Kind,
): Matches | null => {
  if (result.status === 'fulfilled') return result.value;

  logUnanswered(`search for ${kind}`, result.reason);

  return null;
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

  return { tv: answered(shows, 'tv'), movie: answered(movies, 'movie') };
};
