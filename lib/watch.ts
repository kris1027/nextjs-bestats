import type {
  Kind,
  MediaRef,
  SeasonEpisodes,
  ShowEpisodes,
  ShowEpisodesAnswer,
} from '@/lib/media';

/**
 * The rules that move a Watch Record between states, and nothing that touches
 * a database. This file is the half of `lib/watch` a client component may
 * import: the marking control runs `marked` for `useOptimistic`, so nothing
 * here may reach for `lib/db`, whose import throws without `DATABASE_URL`. The
 * queries live in `lib/watch-queries.ts` and the Server Action in
 * `lib/watch-actions.ts`.
 */

/**
 * The three states. `WatchState` is read off this list rather than declared
 * beside it, and the Postgres enum in `lib/schema.ts` satisfies it, so the
 * domain and the database cannot drift. Watched is a Movie's alone and
 * Stopped a Show's alone, which the check constraints on `watch_records` say.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 */
export const WATCH_STATES = ['planned', 'watched', 'stopped'] as const;

/** Planned, Watched or Stopped, and never a fourth thing. */
export type WatchState = (typeof WATCH_STATES)[number];

/**
 * Every Score there is, in the order the stars are drawn. Written out rather
 * than counted up, so the union is ten literals a `Marking` can be checked
 * against rather than `number`, and so the star row has a list to map.
 */
export const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** What one Viewer thought of a piece of Media: one to ten whole stars. */
export type Score = (typeof SCORES)[number];

/** Guards a Score that arrives as a number, such as a parsed form field. */
export const isScore = (value: number): value is Score =>
  SCORES.some((score) => score === value);

/**
 * What a Watch Record says, and what a press of a control says: Planned,
 * Watched at a Score, or Stopped. One value rather than a state and a Score
 * passed alongside each other, because the two are only ever right together —
 * the pairs this union cannot spell are exactly the pairs the check constraint
 * on `watch_records` refuses.
 * — `docs/adr/0016-a-score-is-what-makes-a-record-watched.md`
 */
export type Marking =
  | { state: 'planned' }
  | { state: 'watched'; score: Score }
  | { state: 'stopped' };

/** The Watched half of `Marking`, which is the half that carries a Score. */
export type WatchedMarking = Extract<Marking, { state: 'watched' }>;

/**
 * What an Episode's Watch Record says, which is only ever Watched at a Score:
 * an Episode is never Planned, so the marking an Episode can hold is the half
 * of `Marking` that carries one. `marked` needs nothing else to run on it.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 */
export type EpisodeMarking = WatchedMarking;

/**
 * Whether a Kind's own Watch Record can be Watched at a Score: a Movie's can,
 * and a Show's never is, since a Show is followed through its Episodes. The
 * star row, its skeleton, the action's refusal and the Watched list's paging
 * all ask this, and the check constraint on `watch_records` says it too.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 */
export const takesScore = (kind: Kind): boolean => kind === 'movie';

/** Narrows a marking to one an Episode can hold. */
export const isEpisodeMarking = (marking: Marking): marking is EpisodeMarking =>
  marking.state === 'watched';

/** The Planned marking, which has nothing to vary. */
export const PLANNED: Marking = { state: 'planned' };

/** The Stopped marking, which a Show's record alone can hold. */
export const STOPPED: Marking = { state: 'stopped' };

/** The Watched marking at a Score, which is the only way to reach Watched. */
export const watchedAt = (score: Score): WatchedMarking => ({
  state: 'watched',
  score,
});

/** A marking's Score, or `null` for Planned or Stopped, which never carry one. */
export const scoreOf = (marking: Marking): Score | null =>
  marking.state === 'watched' ? marking.score : null;

/**
 * A row's two columns as one marking. Throws on the pair the check constraint
 * forbids rather than inventing a Score or dropping the state: such a row
 * cannot exist, so meeting one means the constraint is gone and every read
 * below this point is already wrong.
 */
export const toMarking = ({ state, score }: MarkingColumns): Marking => {
  if (state === 'planned') return PLANNED;
  if (state === 'stopped') return STOPPED;
  if (typeof score === 'number' && isScore(score)) return watchedAt(score);

  throw new Error(`A Watched row with no Score: ${score}`);
};

/**
 * One Viewer's recorded relationship to one piece of Media, as much of the
 * row as anything outside the queries needs. The Viewer is not on it: a
 * record is always read for one Viewer, so carrying the id would only invite
 * a page to compare it against something.
 * — `docs/adr/0007-watchlist-and-watched-are-one-record.md`
 */
export type WatchRecord = MarkedMedia & {
  /** The moment of the last marking, which is what the lists order by. */
  updatedAt: Date;
};

/** A marking and the Media it is about, which is what a lookup holds. */
export type MarkedMedia = Marking & { kind: Kind; tmdbId: number };

/**
 * A marking as Postgres stores it: the enum, and a Score that is `null` on a
 * Planned or Stopped row. `toMarking` is the one place the two become one value, so
 * nothing above the queries ever holds a state and a Score apart.
 */
export type MarkingColumns = { state: WatchState; score: number | null };

/** A row as the queries select it: which Media, and what the Viewer said. */
export type WatchRow = { kind: Kind; tmdbId: number } & MarkingColumns;

/**
 * A row as everything above the queries holds it: the two columns become one
 * marking, and the Media they are about comes along. The one crossing between
 * the two shapes, so a caller that already holds a marking — a `WatchRecord`
 * does — never goes back through the columns to build one.
 */
export const toMarkedMedia = ({
  kind,
  tmdbId,
  ...columns
}: WatchRow): MarkedMedia => ({ ...toMarking(columns), kind, tmdbId });

/**
 * What marking does. Pressing what a Watch Record already says unmarks it —
 * `null`, no record — and pressing anything else replaces it: Planned on a
 * Watched record moves it and drops the Score, a Score on a differently
 * scored one rescores it. `null` in is a piece of Media the Viewer has said
 * nothing about, which the glossary is careful to call no state at all rather
 * than a third one.
 *
 * Pure, because it runs twice for every press: on the server against the row
 * as it really is, and on the client for the optimistic flip.
 */
export const marked = (
  current: Marking | null,
  pressed: Marking,
): Marking | null => (markingsAgree(current, pressed) ? null : pressed);

/**
 * Whether two markings say the same thing, no record at all included. Both
 * halves of a marking are compared, because a Score is half of what a Watched
 * marking says: on the state alone, every press of a star on an already
 * Watched record would be an unmark.
 *
 * By value rather than by identity, since the two being compared are usually a
 * marking a render was seeded with and the one the next render brought, which
 * are different objects saying the same thing.
 */
export const markingsAgree = (
  current: Marking | null,
  other: Marking | null,
): boolean =>
  current === other ||
  (current !== null &&
    other !== null &&
    current.state === other.state &&
    scoreOf(current) === scoreOf(other));

/**
 * The name of the one form field a press travels in. One field because a
 * submit button posts one name and one value, and the buttons have to keep
 * working before hydration — `planned`, `stopped` and `1`…`10` are values of
 * the same field rather than a state and a Score the browser cannot post
 * together.
 */
export const MARKING_FIELD = 'marking';

/** How a marking is spelled in that field. */
export const markingValue = (marking: Marking): string =>
  marking.state === 'watched' ? String(marking.score) : marking.state;

/**
 * The marking a field holds, or `null` for anything else. The guard the
 * action reads a press through: the form carries what the Visitor pressed and
 * never what should happen to the row, which `marked` decides.
 */
export const markingFrom = (value: string): Marking | null => {
  if (value === 'planned') return PLANNED;
  if (value === 'stopped') return STOPPED;

  const score = Number(value);

  // `Number('')` is 0 and `Number(' 7 ')` is 7, so the guard does the refusing
  return isScore(score) ? watchedAt(score) : null;
};

/**
 * A Viewer's lists, in the order the header draws them. Not keyed on
 * `WatchState`: a list is placed from what TMDB says as well as from what a
 * record says, so a Planned record can be on one list or another.
 * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
 */
export const LIST_NAMES = ['watchlist', 'upcoming', 'watched'] as const;

/** One of a Viewer's lists. */
export type List = (typeof LIST_NAMES)[number];

/**
 * Where each list lives and the word it wears. One row per list, like
 * `KIND_WORDS`, so the header's links, the tabs and the routes cannot drift
 * apart.
 */
export const LISTS: Record<List, { path: string; label: string }> = {
  watchlist: { path: '/watchlist', label: 'Watchlist' },
  upcoming: { path: '/upcoming', label: 'Upcoming' },
  watched: { path: '/watched', label: 'Watched' },
};

/**
 * The key a page's lookup is built on: `tv/1399`, the spelling of the URL and
 * of the ADRs. Written once here because a TMDB id is unique only within a
 * Kind, and a lookup keyed on the id alone would let a Show answer for a
 * Movie. Takes a `MediaRef`, which a Media Item already is.
 */
export const watchKey = ({ kind, id }: MediaRef): string => `${kind}/${id}`;

/** What a page hands its cards: each piece of Media's marking, by `watchKey`. */
export type WatchLookup = ReadonlyMap<string, Marking>;

/**
 * A lookup and the key of the Viewer whose markings are in it, which is what
 * a page hands its cards. One type rather than two props because the two are
 * only ever right together: a card given the markings without the key renders
 * a control that outlives the Viewer it was seeded for, and leaving a key off
 * is not a type error. `lib/auth` is where the key comes from; this half of
 * `lib/watch` only carries it.
 */
export type ViewerLookup = {
  /** `null` is Unanswered — the database did not say, so no controls. */
  markings: WatchLookup | null;
  viewerKey: string;
};

/**
 * One Viewer's markings for the Episodes a page draws, by TMDB's id for each
 * Episode — the id and not the position, since the id is what a record is
 * keyed on. An Episode with nothing here has no Watch Record.
 */
export type EpisodeLookup = ReadonlyMap<number, EpisodeMarking>;

/**
 * An Episode as its Watch Record names it: TMDB's id for the Episode, which
 * the record is keyed on, and the Show it belongs to, which is the app's own
 * relationship and what finds a Show's records without TMDB.
 * — `docs/adr/0020-an-episode-record-is-keyed-on-its-tmdb-id.md`
 */
export type RecordedEpisode = { showId: number; episodeId: number };

/**
 * An Episode page's lookup and the key of the Viewer whose markings are in it:
 * `ViewerLookup` for Episodes, and one value for the same reason.
 */
export type ViewerEpisodeLookup = {
  /** `null` is Unanswered — the database did not say, so no controls. */
  markings: EpisodeLookup | null;
  viewerKey: string;
};

/**
 * An Episode's marking in a lookup, or `null` when the Viewer has not scored
 * it — no record, not a state.
 */
export const episodeMarkingOf = (
  lookup: EpisodeLookup,
  episodeId: number,
): EpisodeMarking | null => lookup.get(episodeId) ?? null;

/**
 * The ref a Watch Record names: the same pair, spelled the way `lib/media`
 * spells it. A record says `tmdbId` because the column does; everything that
 * asks TMDB says `id`. Said once here rather than at every seam between them.
 */
export const refOf = (record: { kind: Kind; tmdbId: number }): MediaRef => ({
  kind: record.kind,
  id: record.tmdbId,
});

/**
 * Builds the lookup from markings rather than from columns, so what a page
 * already holds it hands over: a query's rows through `toMarkedMedia`, or a
 * list's own Watch Records, which are this shape already. A piece of Media
 * with nothing here is simply absent, which `markingOf` reads as `null`.
 */
export const toLookup = (items: readonly MarkedMedia[]): WatchLookup =>
  new Map(items.map((item) => [watchKey(refOf(item)), markingIn(item)]));

/** The marking half of a `MarkedMedia`, without the Media it is about. */
const markingIn = (item: MarkedMedia): Marking =>
  item.state === 'watched' ? watchedAt(item.score) : { state: item.state };

/**
 * A piece of Media's marking in a lookup, or `null` when the Viewer has said
 * nothing about it — the glossary's "no Watch Record at all", not a third
 * state. Said here once so no caller has to remember the `?? null`.
 */
export const markingOf = (lookup: WatchLookup, ref: MediaRef): Marking | null =>
  lookup.get(watchKey(ref)) ?? null;

/**
 * How many cards a list page shows, and so how many TMDB requests drawing one
 * costs. Twenty is the page size TMDB uses everywhere else in the app. It no
 * longer bounds what a list reads: the Watchlist reads everything tracked and
 * pages it in memory, which `TRACKED_CEILING` bounds instead.
 * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
 */
export const PAGE_SIZE = 20;

/**
 * Refuses a list page that does not count from 1, the way the address bar
 * does. `?page=` is the page's to validate, and a list is where forgetting to
 * shows — as a negative offset in Postgres, or an empty slice in memory.
 */
export const assertListPage = (page: number): void => {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError(`A list page counts from 1, not ${page}`);
  }
};

/**
 * How many presses of a marking control one Viewer gets in a minute before
 * the action refuses the next. A person pressing as fast as they can stays
 * under it; a loop does not. It guards Neon's compute against a runaway
 * client, so it is set where a false refusal on a real press cannot happen.
 */
export const MARKS_PER_MINUTE = 60;

/**
 * One page of one Kind of a Viewer's list, and how many that Kind holds in
 * all. The total is the open tab's and not the whole list's: a page is one
 * Kind's, and so is the page count read off it.
 * — `docs/adr/0015-the-lists-tabs-are-the-kind.md`
 */
export type WatchRecordsPage = {
  records: WatchRecord[];
  total: number;
};

/**
 * The Episodes a Viewer has scored in a Show, by TMDB's id, and when each was
 * last scored: `upNext` reads which, and `finishedAt` reads when.
 */
export type ScoredEpisodes = ReadonlyMap<number, Date>;

/** Where an Episode sits in its Show, without the Show. */
export type EpisodePosition = { season: number; episode: number };

/**
 * What a Viewer watches next in a Show. The Episode, where TMDB lists one, at
 * the day TMDB says it airs; otherwise the Viewer is caught up with what TMDB
 * lists, and `season` is the first season TMDB has announced after the
 * furthest scored with no Episodes in it yet — or `null` where it has
 * announced none, which is waiting or finished and cannot be told apart
 * without the Show's status.
 */
export type UpNext =
  | { episode: EpisodePosition; airDate: string | null }
  | { season: number | null };

/**
 * A Show's seasons without its Specials, which TMDB keeps as season 0 and
 * which belong to no run: neither what comes next nor what finishes a Show.
 */
const regularSeasons = (
  seasons: readonly SeasonEpisodes[],
): readonly SeasonEpisodes[] => seasons.filter((season) => season.number !== 0);

/**
 * The Episodes a Viewer has scored in a Show, by TMDB's id, whatever else each
 * carries: a list's `ScoredEpisodes`, with when, or a page's `EpisodeLookup`,
 * with the Score. Which is scored is all `upNext` and `hasFinished` read.
 */
export type ScoredIds = ReadonlyMap<number, unknown>;

/**
 * What a Viewer watches next: the Episode after the furthest they have
 * scored, and the Show's first when they have scored none. Furthest, not the
 * earliest unscored, so a Viewer who joined at season three is not sent back
 * to season one. Specials neither count nor come next, and a scored id TMDB
 * no longer lists is passed over rather than guessed at.
 *
 * Seasons arrive in viewing order, as `showEpisodes` gives them. The lists
 * ask it to leave Specials out and a Show's page asks for them last; they are
 * passed over here either way, so the rule is this function's and holds
 * whatever hands it the seasons.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 */
export const upNext = (
  seasons: readonly SeasonEpisodes[],
  scored: ScoredIds,
): UpNext => {
  const regular = regularSeasons(seasons);
  const inOrder = regular.flatMap((season) =>
    season.episodes.map((episode) => ({
      id: episode.id,
      airDate: episode.airDate,
      position: { season: season.number, episode: episode.number },
    })),
  );
  // one past the furthest scored, or the first when none is: -1 + 1
  const furthest = inOrder.reduce(
    (found, { id }, index) => (scored.has(id) ? index : found),
    -1,
  );
  const next = inOrder[furthest + 1];

  if (next) return { episode: next.position, airDate: next.airDate };

  const reached = inOrder[furthest]?.position.season ?? 0;
  const announced = regular.find(
    (season) => season.number > reached && season.episodes.length === 0,
  );

  return { season: announced?.number ?? null };
};

/** The last Episode of a Show's last regular season, or none. */
const finalEpisode = (show: ShowEpisodes): { id: number } | undefined =>
  regularSeasons(show.seasons)
    .flatMap((season) => season.episodes)
    .at(-1);

/**
 * Whether a Viewer has finished a Show: TMDB says it has ended and lists
 * nothing after the furthest they have scored. Not a Show still running, one
 * with an Episode left, dated or not, or one with a season announced after
 * it — and not an ended Show with no Episodes, which nobody can have watched.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 *
 * An announced season counts against it even on an ended Show, where the two
 * contradict each other: wrongly calling a Show finished is a claim about the
 * Viewer, and wrongly holding it in Upcoming is only visible.
 */
export const hasFinished = (show: ShowEpisodes, scored: ScoredIds): boolean => {
  if (!show.ended) return false;

  const next = upNext(show.seasons, scored);

  if ('episode' in next || next.season !== null) return false;

  // with nothing after the furthest scored, the final Episode is the furthest
  const final = finalEpisode(show);

  return final !== undefined && scored.has(final.id);
};

/**
 * When a Viewer finished a Show: the moment they scored its final Episode, or
 * `null` for a Show `hasFinished` says they have not.
 */
export const finishedAt = (
  show: ShowEpisodes,
  scored: ScoredEpisodes,
): Date | null => {
  if (!hasFinished(show, scored)) return null;

  const final = finalEpisode(show);

  return (final && scored.get(final.id)) ?? null;
};

/**
 * How far a Viewer has got with a Show, as much as its own control needs: no
 * Episode scored, some scored, or finished.
 */
export type ShowProgress = 'unstarted' | 'underWay' | 'finished';

/**
 * A Show's progress from the Episodes a Viewer has scored and what TMDB says
 * about it, or `null` — Unanswered — where that depends on an answer TMDB did
 * not give. A Viewer who has scored nothing has not started, whatever TMDB
 * says, so only a Show under way needs the answer at all.
 */
export const showProgress = (
  answer: ShowEpisodesAnswer,
  scored: ScoredIds,
): ShowProgress | null => {
  if (scored.size === 0) return 'unstarted';
  if (answer.answer !== 'show') return null;

  return hasFinished(answer.show, scored) ? 'finished' : 'underWay';
};

/**
 * The marking a Show's own control presses, which is the one button it draws,
 * or `null` for no control. A record draws its own button, lit, so a Viewer
 * can always take back what they said; without one, a Show not started draws
 * Planned and a Show under way draws Stop watching. A finished Show has
 * nothing to plan or give up on, and a Show whose progress went Unanswered
 * draws nothing rather than guess it is not finished.
 * — `docs/adr/0018-a-show-is-followed-through-its-episodes.md`
 *
 * Read off what the control shows, so a press that lands flips the button
 * it pressed and never swaps it for another: pressing Stop watching lights
 * Stopped, and pressing Stopped puts Stop watching back.
 */
export const showPress = (
  shown: Marking | null,
  progress: ShowProgress | null,
): Marking | null => {
  if (shown?.state === 'planned' || shown?.state === 'stopped') return shown;
  if (progress === 'unstarted') return PLANNED;
  if (progress === 'underWay') return STOPPED;

  return null;
};

/**
 * A Viewer's record for an Episode TMDB no longer lists: the id it is keyed
 * on and the Score it holds, which is all that is left to draw, since a
 * record stores nothing from TMDB.
 * — `docs/adr/0020-an-episode-record-is-keyed-on-its-tmdb-id.md`
 */
export type GoneEpisode = { episodeId: number; marking: EpisodeMarking };

/**
 * The records among a Show's that are for Episodes TMDB no longer lists, in
 * the order the lookup holds them, or `null` when TMDB's answer cannot say
 * which those are. Specials count as listed, since a Viewer can score one.
 *
 * Only as true as the answer it is handed. An Unanswered one is `null` and
 * never every record: a season TMDB did not answer for is not a season
 * without Episodes, which is why `showEpisodes` throws rather than cut one
 * short and asking for Specials matters. A Gone Show is `null` too, since its
 * page is a 404 with nothing to list on. It only reads, and nothing it finds
 * is deleted — one wrong answer from TMDB would otherwise destroy a Score.
 */
export const goneEpisodes = (
  answer: ShowEpisodesAnswer,
  records: EpisodeLookup,
): GoneEpisode[] | null => {
  if (answer.answer !== 'show') return null;

  const listed = new Set(
    answer.show.seasons.flatMap((season) =>
      season.episodes.map((episode) => episode.id),
    ),
  );

  return [...records]
    .filter(([episodeId]) => !listed.has(episodeId))
    .map(([episodeId, marking]) => ({ episodeId, marking }));
};

/**
 * A Movie or Show a Viewer is tracking, and when they last marked it — the
 * Movie, the Show, or any of the Show's Episodes. What a list places, orders
 * and pages. The Episodes the Viewer has scored come along, by TMDB's id and
 * with when each was last scored, since a Show's are what `upNext` reads and
 * the one that finished it says when the Show was finished; a Movie's or a
 * Planned Show's are none.
 * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
 */
export type TrackedMedia = {
  ref: MediaRef;
  markedAt: Date;
  scored: ScoredEpisodes;
};

/**
 * How many Movies and Shows a list places. Each costs a TMDB request before
 * any page of the list can be drawn, so this is where that cost stops: the
 * latest marked are kept, and the rest are on no page and in no tally, which
 * the list says rather than leaving them to vanish.
 * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
 */
export const TRACKED_CEILING = 200;
