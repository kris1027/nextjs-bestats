import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cache, type JSX, Suspense } from 'react';

import { CardLegend, LEGENDS } from '@/components/media/card-legend';
import { type CardLead, MediaCard } from '@/components/media/media-card';
import { eagerCards, MediaGrid } from '@/components/media/media-grid';
import { MediaGridSkeleton } from '@/components/media/media-skeleton';
import { LinkTabs } from '@/components/navigation/link-tabs';
import { AbsentCard } from '@/components/watch/absent-card';
import { viewer } from '@/lib/auth';
import { formatNumber, formatShortDate } from '@/lib/format';
import {
  episodeCode,
  isKind,
  KIND_WORDS,
  KINDS,
  type Kind,
  type MediaAnswer,
  type MediaRef,
  mediaItems,
  openKind,
  releaseDate,
  showEpisodes,
} from '@/lib/media';
import { signInAddress } from '@/lib/next-path';
import { firstValue, pageNumber, type SearchParams } from '@/lib/search-params';
import { cn, control } from '@/lib/utils';
import { viewerKey } from '@/lib/viewer-key';
import {
  LISTS,
  type List,
  PAGE_SIZE,
  refOf,
  TRACKED_CEILING,
  type TrackedMedia,
  takesScore,
  toLookup,
  type WatchLookup,
  watchKey,
} from '@/lib/watch';
import {
  type PlacedList,
  type PlacedMedia,
  placed,
  placedPage,
  placedTallies,
  type TrackedAnswer,
  withinCeiling,
} from '@/lib/watch-lists';
import {
  trackedMedia,
  watchedMovieCount,
  watchedMoviesPage,
  watchLookup,
} from '@/lib/watch-queries';

/**
 * The address of one tab of one list, at one page. The Kind is spelled even
 * where it is the default, so the address a tab links to and the address a
 * Viewer copies both open the tab they were looking at; `?page=` is left off
 * page 1, which is the tab's own address. The Kind is optional only for the
 * sign-in redirect, which is composed before there is anything to read a
 * default off.
 */
const listAddress = (
  list: List,
  { kind, page = 1 }: { kind?: Kind; page?: number },
): string => {
  const query = new URLSearchParams();

  if (kind) query.set('kind', kind);
  if (page > 1) query.set('page', String(page));

  const search = query.toString();

  return search ? `${LISTS[list].path}?${search}` : LISTS[list].path;
};

/**
 * What an empty tab says. One sentence per list with the Kind's words in it,
 * because a tab is empty on its own: "nothing planned yet" would be false on
 * the Shows tab of a Watchlist holding twenty movies. What the other tab holds
 * is the closed tab's tally to say, not this sentence's.
 */
const EMPTY: Record<List, (kind: Kind) => string> = {
  watchlist: (kind) =>
    `No ${KIND_WORDS[kind].other} to watch now. A Planned ${KIND_WORDS[kind].one} that is out will appear here.`,
  upcoming: (kind) =>
    `No ${KIND_WORDS[kind].other} to wait for. A Planned ${KIND_WORDS[kind].one} that is not out yet will appear here.`,
  // a Show is never marked Watched, so its tab says what lands one here. Not
  // "finished", and not every Episode either: being caught up is read off the
  // furthest Episode scored, so the ones before it need not be. An undated
  // Episode cannot be scored, so the furthest always has a day and the
  // sentence can name the latest that has one
  watched: (kind) =>
    takesScore(kind)
      ? `No ${KIND_WORDS[kind].other} watched yet. Score a ${KIND_WORDS[kind].one} and it will appear here.`
      : `No ${KIND_WORDS[kind].other} here yet. A ${KIND_WORDS[kind].one} will appear here once you have scored the latest episode that has a date.`,
};

/**
 * Whether a tab is Watch Records that Postgres counts and pages, rather than
 * tracked Media placed from TMDB's answers: the Watched list's Movies, since
 * a Watched Movie is a record of its own. The tallies and the grid both ask.
 */
const pagedByRecords = (list: List, kind: Kind): boolean =>
  list === 'watched' && takesScore(kind);

/**
 * The list as an address opens it, which is what both halves of the page
 * read: who is asking, which tab, at which page. Not named `List`, which is
 * the word for which list this is, and this holds one of those rather than
 * being one.
 */
type OpenList = {
  viewerId: string;
  /**
   * The key the cards on this page are rendered under, made here from the
   * Viewer `viewer()` answered with rather than rebuilt downstream from the
   * id beside it — `lib/viewer-key.ts`.
   */
  viewerKey: string;
  /**
   * The Kind the address names, or `undefined` where it names none and the
   * Kind is read off the tallies.
   */
  named: Kind | undefined;
  page: number;
};

/** This list's two tallies, which the tabs wear, and the Kind read off them. */
type ListTallies = {
  tallies: Record<Kind, number>;
  kind: Kind;
};

/**
 * Which list is open and what its pages are cut from: everything the Viewer is
 * tracking, placed and paged in memory, and the day it was placed against,
 * which its cards' dates are read against too. The Watched list's Movies are
 * the exception, since a Watched Movie is a Watch Record and Postgres pages
 * those; its Shows are the ones nothing dated is left of, which only TMDB
 * can say.
 */
type ListContents = {
  list: PlacedList;
  placements: Placement[];
  /** Whether the ceiling left tracked Media off, which the page says. */
  cut: boolean;
  today: Date;
};

/**
 * The answer `mediaItems` gave for the ref at `index`. Answers come back one
 * per ref, so the fallback cannot happen; it is here for the type, and a ref
 * with no answer is Unanswered as the word says.
 */
const answerAt = (
  answers: readonly MediaAnswer[],
  index: number,
): MediaAnswer => answers[index] ?? { answer: 'unanswered' };

/**
 * A tracked Movie or Show, placed, and what TMDB answered for its card — kept
 * together because both come out of the one round of asking TMDB that
 * placing costs, and a page drawn from a placement would otherwise ask again.
 */
type Placement = PlacedMedia & { answer: MediaAnswer };

/**
 * What TMDB says about a tracked Movie or Show, as much as placing it needs:
 * a Movie's release day, a Show's seasons, or the absence its card came back
 * with. Seasons TMDB did not answer for leave the Show Unanswered, so it is
 * drawn on both lists rather than placed by half an answer, and the log says
 * why.
 */
const trackedAnswer = async (
  item: TrackedMedia,
  answer: MediaAnswer,
): Promise<TrackedAnswer> => {
  if (answer.answer !== 'item') return { answer: answer.answer };

  try {
    if (item.ref.kind === 'movie') {
      return { answer: 'movie', releaseDate: await releaseDate(item.ref.id) };
    }

    const show = await showEpisodes(item.ref.id);

    return show ? { answer: 'show', ...show } : { answer: 'gone' };
  } catch (cause) {
    console.error(`TMDB ${watchKey(item.ref)} placing went Unanswered:`, cause);

    return { answer: 'unanswered' };
  }
};

/**
 * Everything a Viewer is tracking, placed. TMDB is asked about every item up
 * to the ceiling before any page is cut, since which list an item is on is
 * TMDB's to say; the `lib/tmdb` cache is what keeps a second visit cheap.
 */
const placeTracked = async (
  viewerId: string,
  today: Date,
): Promise<{ placements: Placement[]; cut: boolean }> => {
  const { kept, cut } = withinCeiling(await trackedMedia(viewerId));
  const answers = await mediaItems(kept.map((item) => item.ref));
  const placements = await Promise.all(
    kept.map(async (item, index): Promise<Placement> => {
      const answer = answerAt(answers, index);

      return {
        ...placed(item, await trackedAnswer(item, answer), today),
        answer,
      };
    }),
  );

  return { placements, cut };
};

/**
 * Who is asking and which tab of which page, asked for once per request and
 * shared by both halves of the list — the use `app/page.tsx` puts `cache` to,
 * one page over. `listContents` and `listTallies` are cached beside it for
 * the same reason, and kept apart from it so a tab that is not placed from
 * TMDB — the Watched list's Movies, named in the address — draws its grid
 * without waiting on TMDB for the other tab's count.
 *
 * `cache` keys on argument identity, and every caller is handed the very
 * `searchParams` promise the page was given, so they share one entry.
 *
 * A Visitor is sent to sign in and back to this very address. It carries the
 * Kind only if the address named one — the default is read off counts this
 * Visitor does not have — and `?page=` only alongside it, for the reason the
 * tabs drop `?page=`: a page of one Kind is often past the end of the other.
 */
const openList = cache(
  async (
    list: List,
    searchParams: Promise<SearchParams>,
  ): Promise<OpenList> => {
    const params = await searchParams;
    const page = pageNumber(params.page);
    // `?kind=abc` is a typo rather than an address, so it falls through to the
    // default the way `/search` lets it — `lib/search-params.ts`
    const asked = firstValue(params.kind);
    const named = isKind(asked) ? asked : undefined;

    const currentViewer = await viewer();

    if (!currentViewer) {
      // a page number with no Kind beside it is a page of a list nobody has
      // chosen yet: this Visitor comes back, the default is read off their
      // counts, and page 2 of a Kind with one page is `notFound()` below
      redirect(
        signInAddress(listAddress(list, named ? { kind: named, page } : {})),
      );
    }

    return {
      viewerId: currentViewer.id,
      viewerKey: viewerKey(currentViewer),
      named,
      page,
    };
  },
);

/** Everything the Viewer is tracking, placed, once per request. */
const listContents = cache(
  async (
    list: List,
    searchParams: Promise<SearchParams>,
  ): Promise<ListContents> => {
    const { viewerId } = await openList(list, searchParams);
    // read once, so every item is placed, and every card dated, against the
    // same day even when the request straddles midnight
    const today = new Date();

    return { list, ...(await placeTracked(viewerId, today)), today };
  },
);

/**
 * This list's tallies and the Kind read off them, once per request. Both wait
 * on TMDB, since one tab of every list is placed from its answers.
 */
const listTallies = cache(
  async (
    list: List,
    searchParams: Promise<SearchParams>,
  ): Promise<ListTallies> => {
    const { viewerId, named } = await openList(list, searchParams);
    const { placements } = await listContents(list, searchParams);
    const placedCounts = placedTallies(placements, list);
    const tallyOf = async (kind: Kind): Promise<number> =>
      pagedByRecords(list, kind)
        ? watchedMovieCount(viewerId)
        : placedCounts[kind];
    const tallies = { tv: await tallyOf('tv'), movie: await tallyOf('movie') };

    return {
      tallies,
      // what this Viewer holds is this page's answer to what `openKind` asks,
      // so a Watchlist that is all Movies opens on Movies
      kind: named ?? openKind({ tv: tallies.tv > 0, movie: tallies.movie > 0 }),
    };
  },
);

/** The two tabs, wearing this list's two counts once they are counted. */
const ListTabs = async ({
  list,
  searchParams,
}: {
  list: List;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> => {
  const { kind, tallies } = await listTallies(list, searchParams);

  return <Tabs list={list} selected={kind} tallies={tallies} />;
};

/**
 * A list's two tabs, one per Kind, with or without their counts. They say
 * nothing about the list: the heading names it, and the header's two
 * links are what move between them.
 *
 * `replace`, because opening the other Kind is a step within this list rather
 * than another page of it — the call `KindTabs` makes for the same reason,
 * against the `Previous`/`Next` links below, which are pages and push. The
 * href drops `?page=`, since the two Kinds are different lengths and page 3
 * of one is often past the end of the other.
 *
 * With no `selected`, neither tab is marked. That is the fallback, and it is
 * drawn in the prerendered shell, which reads no `searchParams`: it cannot
 * mark even the Kind an address names, the way `/search`'s fallback does from
 * inside a boundary that has already read one.
 *
 * Guessing is no way out either. Which tab is open is what the counts decide,
 * so before they land a guess would move the mark under a Viewer whose list
 * is all Movies. It gains a mark; it never changes one.
 */
const Tabs = ({
  list,
  selected,
  tallies,
}: {
  list: List;
  selected?: Kind;
  tallies?: Record<Kind, number>;
}): JSX.Element => (
  // Labelled with the two words the reader sees rather than with "Kind", the
  // way the search tabs are: Kind is the glossary's word for the distinction,
  // not a word a visitor hearing this nav announced would recognise.
  <LinkTabs
    label='Shows or movies'
    replace
    tabs={KINDS.map((kind) => ({
      href: listAddress(list, { kind }),
      label: KIND_WORDS[kind].label,
      selected: kind === selected,
      tally: tallies?.[kind],
    }))}
  />
);

/** One card on a page of a list: the Media, and what TMDB answered for it. */
type ListEntry = {
  ref: MediaRef;
  answer: MediaAnswer;
  /** The pill over its poster, or `null` for a card that draws none. */
  lead: CardLead | null;
  /**
   * Whether the Viewer has scored an Episode of this Show, which is what an
   * `AbsentCard` offers Stop watching for and a `MediaCard` withholds its
   * bookmark for; never a Movie.
   */
  underWay: boolean;
};

/** What one page of a list draws: its cards in order, and their markings. */
type ListEntries = {
  entries: ListEntry[];
  markings: WatchLookup;
  total: number;
};

/**
 * What a placed list says when the ceiling left tracked Media off it, which
 * would otherwise be on no page and in no tally without a word.
 */
const CEILING_NOTE = `Only the ${formatNumber(TRACKED_CEILING)} movies and shows you marked most recently are placed on your lists. Older ones are left off.`;

/** What a card says where TMDB has given no day. */
const NO_DATE = 'No date yet';

/**
 * The pill a card on a placed list draws over its poster. On the
 * Watchlist a Show names its next Episode and a Movie draws nothing, since
 * everything there is out; on Upcoming every card says what it waits for and
 * when — **S3E1 · Mar 12**, **S3 · No date yet**, **Mar 12** for a Movie.
 *
 * On Watched a Show says what TMDB has announced and not dated — **S4E1 · No
 * date yet**, **S5 · No date yet** — and a Show with nothing ahead of the
 * Viewer at all says nothing, which is what tells the two apart: a Show that
 * is over draws no pill, and one between seasons draws the announcement that
 * would otherwise be nowhere on the lists. A Movie there draws nothing
 * either, since the tab it is on is paged from records and asks for no lead.
 *
 * A card TMDB gave no answer to place by draws nothing, since its day is not
 * "no date" but unknown.
 */
const leadOf = (
  list: PlacedList,
  { tracked, placedBy, upNext, day }: PlacedMedia,
  today: Date,
): CardLead | null => {
  // a day held to its month, so a pill too narrow for "S12E10 · Sep 17, 2027"
  // at the 320px floor breaks at the dot, then after the comma, and never
  // between "Sep" and "17"; "No date yet" is words, and breaks where a pill
  // needs it to
  const date =
    (day && formatShortDate(day, today))?.replace(/(?<!,) /g, '\u00a0') ??
    NO_DATE;
  // the Watchlist's Episode is out, and a TV says so; anything else is
  // waiting on a day, had or not, and a calendar says that
  const glyph = list === 'watchlist' ? 'episode' : 'date';

  if (placedBy === 'movie') {
    return list === 'upcoming'
      ? { label: 'Release date', text: date, glyph: 'date', episode: null }
      : null;
  }

  if (placedBy !== 'show' || !upNext) return null;

  if ('episode' in upNext) {
    const episode = { showId: tracked.ref.id, ...upNext.episode };
    const code = episodeCode(episode);

    return {
      label: 'Next episode',
      // the Watchlist's Episode is out, so its day is the one thing left off
      text: list === 'watchlist' ? code : `${code} · ${date}`,
      glyph,
      // TMDB lists this Episode, so its page is there to lead to
      episode,
    };
  }

  // nothing is listed to lead to, so what is left leads to the Show itself
  if (upNext.season !== null) {
    return {
      label: 'Next season',
      text: `S${upNext.season} · ${NO_DATE}`,
      glyph: 'date',
      episode: null,
    };
  }

  // and nothing at all is announced: on Watched that is a Show that is over,
  // which says nothing, and elsewhere a Show TMDB lists no Episodes for yet
  return list === 'watched'
    ? null
    : { label: 'Next episode', text: NO_DATE, glyph: 'date', episode: null };
};

/**
 * One page of one Kind of a placed list, cut from what is placed on it. TMDB
 * has answered for every card on it already, in placing; only the markings
 * are asked for.
 */
const placedEntries = async (
  viewerId: string,
  { list, placements, today }: ListContents,
  { kind, page }: { kind: Kind; page: number },
): Promise<ListEntries> => {
  const { items, total } = placedPage(placements, list, { kind, page });
  const refs = items.map((item) => item.tracked.ref);
  // a Show under way has no record, so the markings are asked for rather than
  // read off the page, and such a card simply has none
  const markings = await watchLookup(viewerId, refs);

  return {
    entries: items.map((item) => ({
      ref: item.tracked.ref,
      answer: item.answer,
      lead: leadOf(list, item, today),
      underWay: item.tracked.scored.size > 0,
    })),
    markings,
    total,
  };
};

/**
 * One page of the Watched list's Movies: the records are one round trip, and
 * the Media behind them a TMDB request apiece.
 */
const watchedMovieEntries = async (
  viewerId: string,
  page: number,
): Promise<ListEntries> => {
  const { records, total } = await watchedMoviesPage(viewerId, page);
  const refs = records.map(refOf);
  const answers = await mediaItems(refs);

  return {
    entries: refs.map((ref, index) => ({
      ref,
      answer: answerAt(answers, index),
      lead: null,
      underWay: false,
    })),
    // the page's own records are its lookup: every card on it has a marking
    markings: toLookup(records),
    total,
  };
};

/**
 * One page of one tab, which is the wait this boundary holds the grid's shape
 * for. A record whose Media came back Gone or Unanswered still renders, as an
 * `AbsentCard`.
 */
const ListPage = async ({
  list,
  searchParams,
}: {
  list: List;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> => {
  const { viewerId, viewerKey, named, page } = await openList(
    list,
    searchParams,
  );
  const kind = named ?? (await listTallies(list, searchParams)).kind;

  // a page past the end has no cards, so it asks for no markings before it
  // 404s; page 1 of nothing is the empty state below, since a tab with nothing on
  // it still exists
  const contents = pagedByRecords(list, kind)
    ? null
    : await listContents(list, searchParams);
  const { entries, markings, total } = contents
    ? await placedEntries(viewerId, contents, { kind, page })
    : await watchedMovieEntries(viewerId, page);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page > pages) notFound();

  // said on an empty tab too, since what the ceiling left off may be all of it
  const ceiling = contents?.cut ? (
    <p className='text-sm opacity-60'>{CEILING_NOTE}</p>
  ) : null;

  if (total === 0) {
    return (
      <>
        {ceiling}
        <p className='opacity-60'>{EMPTY[list](kind)}</p>
        <Link href='/' className={cn(control, 'self-start')}>
          Browse trending
        </Link>
      </>
    );
  }

  const lookup = { markings, viewerKey };

  return (
    <>
      {ceiling}
      <MediaGrid>
        {entries.map(({ ref, answer, lead, underWay }, index) => {
          const key = watchKey(ref);

          return answer.answer === 'item' ? (
            <MediaCard
              key={key}
              item={answer.item}
              lookup={lookup}
              lead={lead}
              underWay={underWay}
              eager={index < eagerCards}
            />
          ) : (
            <AbsentCard
              key={key}
              media={ref}
              answer={answer.answer}
              underWay={underWay}
              lookup={lookup}
            />
          );
        })}
      </MediaGrid>
      {pages > 1 ? (
        <nav
          aria-label='Pages'
          className='flex items-center justify-between gap-4'
        >
          {page > 1 ? (
            <Link
              href={listAddress(list, { kind, page: page - 1 })}
              className={control}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <p className='text-sm opacity-60'>
            Page {formatNumber(page)} of {formatNumber(pages)}
          </p>
          {page < pages ? (
            <Link
              href={listAddress(list, { kind, page: page + 1 })}
              className={control}
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
};

/**
 * One page of one of a Viewer's lists — the Watchlist, Upcoming or the
 * Watched list — shared by the three routes, which differ only in the list
 * they show. A page shows one Kind of that list at a time, which `?kind=`
 * names.
 *
 * The heading and the tabs are the shell, and the heading is where the list
 * is named: the tabs are the Kind, and the header's links are the way to the
 * other lists. The tallies stream into the tabs and the cards into the grid,
 * each behind a boundary of its own. Both wait on TMDB, which is asked about
 * everything tracked, and each Show's seasons, before either can be counted —
 * on the Watched list too, whose Shows are the caught up ones. Its Movies are
 * the one tab the database counts and pages, with TMDB asked for their cards
 * a request apiece, so an address naming that tab draws its grid without
 * waiting for the Shows to be placed.
 *
 * Nothing moves when a card here is marked. A card pressed out of this list
 * shows its new state where it is, and the list catches up on the next
 * navigation; that keeps the undo one press away.
 */
const WatchRecordList = ({
  list,
  searchParams,
}: {
  list: List;
  searchParams: Promise<SearchParams>;
}): JSX.Element => (
  <main className='flex-1 p-4'>
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 py-4'>
      {/* no Back here: the header and the tabs are the ways off a list,
          and the empty state's "Browse trending" would only repeat one */}
      <h1 className='font-black text-3xl leading-[1.05]'>
        {LISTS[list].label}
      </h1>
      <Suspense fallback={<Tabs list={list} />}>
        <ListTabs list={list} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<MediaGridSkeleton />}>
        <ListPage list={list} searchParams={searchParams} />
      </Suspense>
      {/* in the shell, so after the page links rather than between them and
          the grid: those stream with the cards */}
      <CardLegend entries={LEGENDS.list} />
    </div>
  </main>
);

export { WatchRecordList };
