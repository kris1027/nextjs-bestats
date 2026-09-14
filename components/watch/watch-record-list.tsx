import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cache, type JSX, Suspense } from 'react';

import { type CardLead, MediaCard } from '@/components/media/media-card';
import { MediaGrid } from '@/components/media/media-grid';
import { MediaGridSkeleton } from '@/components/media/media-skeleton';
import { LinkTabs } from '@/components/navigation/link-tabs';
import { AbsentCard } from '@/components/watch/absent-card';
import { viewer } from '@/lib/auth';
import { formatNumber, formatShortDate, type NounForms } from '@/lib/format';
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
  type TrackedMedia,
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
  watchedTallies,
  watchLookup,
  watchRecordsPage,
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
const EMPTY: Record<List, (words: NounForms) => string> = {
  watchlist: ({ one, other }) =>
    `No ${other} to watch now. A Planned ${one} that is out will appear here.`,
  upcoming: ({ one, other }) =>
    `No ${other} to wait for. A Planned ${one} that is not out yet will appear here.`,
  watched: ({ one, other }) =>
    `No ${other} watched yet. Mark a ${one} Watched and it will appear here.`,
};

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
  /** This list's two tallies, which the tabs wear and the Kind is read off. */
  tallies: Record<Kind, number>;
  /**
   * Everything the Viewer is tracking, placed, on the Watchlist and Upcoming,
   * which are paged in memory. `null` on the Watched list, which Postgres
   * still pages.
   * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
   */
  placements: Placement[] | null;
  kind: Kind;
  page: number;
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
type Placement = { media: PlacedMedia; answer: MediaAnswer };

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

    const seasons = await showEpisodes(item.ref.id);

    return seasons ? { answer: 'show', seasons } : { answer: 'gone' };
  } catch (cause) {
    console.error(`TMDB ${watchKey(item.ref)} placing went Unanswered:`, cause);

    return { answer: 'unanswered' };
  }
};

/**
 * Everything a Viewer is tracking, placed. TMDB is asked about every item up
 * to the ceiling before any page is cut, since which list an item is on is
 * TMDB's to say; the `lib/tmdb` cache is what keeps a second visit cheap.
 * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
 */
const placeTracked = async (viewerId: string): Promise<Placement[]> => {
  const tracked = withinCeiling(await trackedMedia(viewerId));
  const answers = await mediaItems(tracked.map((item) => item.ref));
  // read once, so every item is placed against the same day
  const today = new Date();

  return Promise.all(
    tracked.map(async (item, index): Promise<Placement> => {
      const answer = answerAt(answers, index);

      return {
        media: placed(item, await trackedAnswer(item, answer), today),
        answer,
      };
    }),
  );
};

/**
 * Everything both halves of a list need, asked for once per request. The tabs
 * wear the counts and the grid needs the Kind, and the Kind is read off the
 * counts, so one round trip answers both rather than two boundaries racing to
 * the same rows — the use `app/page.tsx` puts `cache` to, one page over.
 *
 * `cache` keys on argument identity, and both callers are handed the very
 * `searchParams` promise the page was given, so the two share one entry.
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

    const placements =
      list === 'watched' ? null : await placeTracked(currentViewer.id);
    const tallies =
      placements && list !== 'watched'
        ? placedTallies(
            placements.map(({ media }) => media),
            list,
          )
        : await watchedTallies(currentViewer.id);

    return {
      viewerId: currentViewer.id,
      viewerKey: viewerKey(currentViewer),
      tallies,
      placements,
      // what this Viewer holds is this page's answer to what `openKind` asks,
      // so a Watchlist that is all Movies opens on Movies
      kind: named ?? openKind({ tv: tallies.tv > 0, movie: tallies.movie > 0 }),
      page,
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
  const { kind, tallies } = await openList(list, searchParams);

  return <Tabs list={list} selected={kind} tallies={tallies} />;
};

/**
 * A list's two tabs, one per Kind, with or without their counts. They say
 * nothing about the list: the heading names it, and the header's two
 * links are what move between them.
 * — `docs/adr/0015-the-lists-tabs-are-the-kind.md`
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
 * — `docs/adr/0010-the-shell-is-prerendered.md`
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
  /** The line under its title bar, or `null` for a card that draws none. */
  lead: CardLead | null;
};

/** What one page of a list draws: its cards in order, and their markings. */
type ListEntries = {
  entries: ListEntry[];
  markings: WatchLookup;
  total: number;
};

/** What a card says where TMDB has given no day. */
const NO_DATE = 'No date yet';

/**
 * The line a card on a placed list draws under its title bar. On the
 * Watchlist a Show names its next Episode and a Movie draws nothing, since
 * everything there is out; on Upcoming every card says what it waits for and
 * when — **S3E1 · Mar 12**, **S3 · No date yet**, **Mar 12** for a Movie. A
 * card TMDB gave no answer to place by draws nothing, since its day is not
 * "no date" but unknown.
 */
const leadOf = (
  list: PlacedList,
  { tracked, answer, upNext, day }: PlacedMedia,
  today: Date,
): CardLead | null => {
  // unbroken, so a line too long for a 136px card at the 320px floor —
  // "S12E10 · Sep 17, 2027" — wraps at the dot rather than inside the date
  const date = ((day && formatShortDate(day, today)) ?? NO_DATE).replaceAll(
    ' ',
    ' ',
  );

  if (answer === 'movie') {
    return list === 'upcoming'
      ? { label: 'Release date', text: date, episode: null }
      : null;
  }

  if (answer !== 'show' || !upNext) return null;

  if ('episode' in upNext) {
    const episode = { showId: tracked.ref.id, ...upNext.episode };
    const code = episodeCode(episode);

    return {
      label: 'Next episode',
      text: list === 'upcoming' ? `${code} · ${date}` : code,
      // TMDB lists this Episode, so its page is there to lead to
      episode,
    };
  }

  // caught up: nothing is listed to lead to, so the card leads to the Show
  return upNext.season === null
    ? { label: 'Next episode', text: NO_DATE, episode: null }
    : {
        label: 'Next season',
        text: `S${upNext.season} · ${NO_DATE}`,
        episode: null,
      };
};

/**
 * One page of the Watchlist or Upcoming, cut from what is placed on it. TMDB
 * has answered for every card on it already, in placing; only the markings
 * are asked for.
 */
const placedEntries = async (
  viewerId: string,
  placements: readonly Placement[],
  list: PlacedList,
  { kind, page }: { kind: Kind; page: number },
): Promise<ListEntries> => {
  const answers = new Map(
    placements.map(({ media, answer }) => [
      watchKey(media.tracked.ref),
      answer,
    ]),
  );
  const { items, total } = placedPage(
    placements.map(({ media }) => media),
    list,
    { kind, page },
  );
  const refs = items.map((item) => item.tracked.ref);
  // a Show under way has no record, so the markings are asked for rather than
  // read off the page, and such a card simply has none
  const markings = await watchLookup(viewerId, refs);
  const today = new Date();

  return {
    entries: items.map((item) => ({
      ref: item.tracked.ref,
      // every placed item has its answer; the fallback is for the type
      answer: answers.get(watchKey(item.tracked.ref)) ?? {
        answer: 'unanswered',
      },
      lead: leadOf(list, item, today),
    })),
    markings,
    total,
  };
};

/**
 * One page of the Watched list: the records are one round trip, and the Media
 * behind them a TMDB request apiece.
 */
const watchedEntries = async (
  viewerId: string,
  { kind, page }: { kind: Kind; page: number },
): Promise<ListEntries> => {
  const { records, total } = await watchRecordsPage(viewerId, {
    state: 'watched',
    kind,
    page,
  });
  const refs = records.map(refOf);
  const answers = await mediaItems(refs);

  return {
    entries: refs.map((ref, index) => ({
      ref,
      answer: answerAt(answers, index),
      lead: null,
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
  const { viewerId, viewerKey, placements, kind, page } = await openList(
    list,
    searchParams,
  );

  // a page past the end has no cards, so it asks for no markings before it
  // 404s; page 1 of nothing is the empty state below, since a tab with nothing on
  // it still exists
  const { entries, markings, total } =
    placements && list !== 'watched'
      ? await placedEntries(viewerId, placements, list, { kind, page })
      : await watchedEntries(viewerId, { kind, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page > pages) notFound();

  if (total === 0) {
    return (
      <>
        <p className='opacity-60'>{EMPTY[list](KIND_WORDS[kind])}</p>
        <Link href='/' className={cn(control, 'self-start')}>
          Browse trending
        </Link>
      </>
    );
  }

  const lookup = { markings, viewerKey };

  return (
    <>
      <MediaGrid>
        {entries.map(({ ref, answer, lead }) => {
          const key = watchKey(ref);

          return answer.answer === 'item' ? (
            <MediaCard
              key={key}
              item={answer.item}
              lookup={lookup}
              lead={lead}
            />
          ) : (
            <AbsentCard
              key={key}
              media={ref}
              answer={answer.answer}
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
 * — `docs/adr/0015-the-lists-tabs-are-the-kind.md`
 *
 * The heading and the tabs are the shell, and the heading is where the list
 * is named: the tabs are the Kind, and the header's links are the way to the
 * other lists. The tallies stream into the tabs and the cards into the grid,
 * each behind a boundary of its own. On the Watched list the database answers
 * the tallies in one round trip and TMDB the cards in a request apiece; on the
 * Watchlist and Upcoming both wait on TMDB, which is asked about everything
 * tracked, and each Show's seasons, before either can be counted.
 *
 * Nothing moves when a card here is marked. A card pressed out of this list
 * shows its new state where it is, and the list catches up on the next
 * navigation; that keeps the undo one press away.
 * — `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
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
      <Suspense fallback={<MediaGridSkeleton lead={list === 'upcoming'} />}>
        <ListPage list={list} searchParams={searchParams} />
      </Suspense>
    </div>
  </main>
);

export { WatchRecordList };
