import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cache, type JSX, Suspense } from 'react';

import { MediaCard } from '@/components/media/media-card';
import { MediaGrid } from '@/components/media/media-grid';
import { MediaGridSkeleton } from '@/components/media/media-skeleton';
import { LinkTabs } from '@/components/navigation/link-tabs';
import { AbsentCard } from '@/components/watch/absent-card';
import { viewer } from '@/lib/auth';
import { formatNumber, type NounForms } from '@/lib/format';
import {
  type EpisodeRef,
  isKind,
  KIND_WORDS,
  KINDS,
  type Kind,
  type MediaAnswer,
  type MediaRef,
  mediaItems,
  openKind,
  showEpisodes,
} from '@/lib/media';
import { signInAddress } from '@/lib/next-path';
import { firstValue, pageNumber, type SearchParams } from '@/lib/search-params';
import { cn, control } from '@/lib/utils';
import { viewerKey } from '@/lib/viewer-key';
import {
  LISTS,
  nextEpisode,
  PAGE_SIZE,
  refOf,
  type TrackedRecord,
  toLookup,
  type WatchLookup,
  type WatchState,
  watchKey,
  watchlistPage,
} from '@/lib/watch';
import {
  trackedMedia,
  watchLookup,
  watchRecordsPage,
  watchTallies,
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
  state: WatchState,
  { kind, page = 1 }: { kind?: Kind; page?: number },
): string => {
  const query = new URLSearchParams();

  if (kind) query.set('kind', kind);
  if (page > 1) query.set('page', String(page));

  const search = query.toString();

  return search ? `${LISTS[state].path}?${search}` : LISTS[state].path;
};

/**
 * What an empty tab says. One sentence per state with the Kind's words in it,
 * because a tab is empty on its own: "nothing planned yet" would be false on
 * the Shows tab of a Watchlist holding twenty movies. What the other tab holds
 * is the closed tab's tally to say, not this sentence's.
 */
const EMPTY: Record<WatchState, (words: NounForms) => string> = {
  planned: ({ one, other }) =>
    `No ${other} planned yet. Mark a ${one} Planned and it will appear here.`,
  watched: ({ one, other }) =>
    `No ${other} watched yet. Mark a ${one} Watched and it will appear here.`,
};

/**
 * The list as an address opens it, which is what both halves of the page
 * read: who is asking, which tab, at which page. Not named for the state it
 * is in — `WatchState` is that word, and this holds one of those rather than
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
   * Everything the Viewer is tracking, on the Watchlist, which is placed and
   * paged in memory. `null` on the Watched list, which Postgres still pages.
   * — `docs/adr/0019-the-lists-are-paged-by-tmdb-not-by-postgres.md`
   */
  tracked: TrackedRecord[] | null;
  kind: Kind;
  page: number;
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
    state: WatchState,
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
        signInAddress(listAddress(state, named ? { kind: named, page } : {})),
      );
    }

    const tracked =
      state === 'planned' ? await trackedMedia(currentViewer.id) : null;
    // the tallies are the placed set's on the Watchlist, and read off any page
    // of it, since both Kinds are counted whichever one is open
    const tallies = tracked
      ? watchlistPage(tracked, { kind: 'tv', page: 1 }).tallies
      : (await watchTallies(currentViewer.id))[state];

    return {
      viewerId: currentViewer.id,
      viewerKey: viewerKey(currentViewer),
      tallies,
      tracked,
      // what this Viewer holds is this page's answer to what `openKind` asks,
      // so a Watchlist that is all Movies opens on Movies
      kind: named ?? openKind({ tv: tallies.tv > 0, movie: tallies.movie > 0 }),
      page,
    };
  },
);

/** The two tabs, wearing this state's two counts once the database has answered. */
const ListTabs = async ({
  state,
  searchParams,
}: {
  state: WatchState;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> => {
  const { kind, tallies } = await openList(state, searchParams);

  return <Tabs state={state} selected={kind} tallies={tallies} />;
};

/**
 * A list's two tabs, one per Kind, with or without their counts. They say
 * nothing about the state: the heading names the list, and the header's two
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
  state,
  selected,
  tallies,
}: {
  state: WatchState;
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
      href: listAddress(state, { kind }),
      label: KIND_WORDS[kind].label,
      selected: kind === selected,
      tally: tallies?.[kind],
    }))}
  />
);

/**
 * What one page of a list draws: the Media on it, in order, and for each Show
 * on the Watchlist the Episode its card leads to.
 */
type ListEntries = {
  refs: MediaRef[];
  answers: MediaAnswer[];
  /** One per ref; `null` for a Movie, or a Show with no Episode to lead to. */
  nexts: (EpisodeRef | null)[];
  markings: WatchLookup;
  total: number;
};

/**
 * The Episode a Watchlist card for a Show leads to, or `null` where there is
 * none to name — TMDB lists nothing after the furthest, or did not answer for
 * the seasons, in which case the card leads to the Show as any card does and
 * the log says why.
 */
const nextFor = async (item: TrackedRecord): Promise<EpisodeRef | null> => {
  try {
    const seasons = await showEpisodes(item.ref.id);
    const next = seasons && nextEpisode(seasons, item.scored);

    return next && { showId: item.ref.id, ...next };
  } catch (cause) {
    console.error(`TMDB ${watchKey(item.ref)} seasons went Unanswered:`, cause);

    return null;
  }
};

/**
 * One page of the Watchlist: placed and paged in memory from the tracked set,
 * then TMDB asked about the page's twenty, and each Show's seasons for its
 * next Episode. Only the open page costs TMDB in this slice, since nothing yet
 * places an item by what TMDB says about it.
 */
const watchlistEntries = async (
  viewerId: string,
  tracked: readonly TrackedRecord[],
  { kind, page }: { kind: Kind; page: number },
): Promise<ListEntries> => {
  const { items, total } = watchlistPage(tracked, { kind, page });
  const refs = items.map((item) => item.ref);
  // a Show under way has no record, so the markings are asked for rather than
  // read off the page, and such a card simply has none
  const [answers, markings] = await Promise.all([
    mediaItems(refs),
    watchLookup(viewerId, refs),
  ]);
  const nexts = await Promise.all(
    items.map((item, index) =>
      item.ref.kind === 'tv' && answers[index]?.answer === 'item'
        ? nextFor(item)
        : null,
    ),
  );

  return { refs, answers, nexts, markings, total };
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

  return {
    refs,
    // in the refs' order, so an answer and its record share an index
    answers: await mediaItems(refs),
    nexts: refs.map(() => null),
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
  state,
  searchParams,
}: {
  state: WatchState;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> => {
  const { viewerId, viewerKey, tracked, kind, page } = await openList(
    state,
    searchParams,
  );

  // a page past the end has no refs, so it asks TMDB nothing before it 404s;
  // page 1 of nothing is the empty state below, since a tab with nothing on
  // it still exists
  const { refs, answers, nexts, markings, total } = tracked
    ? await watchlistEntries(viewerId, tracked, { kind, page })
    : await watchedEntries(viewerId, { kind, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page > pages) notFound();

  if (total === 0) {
    return (
      <>
        <p className='opacity-60'>{EMPTY[state](KIND_WORDS[kind])}</p>
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
        {refs.map((ref, index) => {
          const answer = answers[index];
          const key = watchKey(ref);

          // the answers are one per ref, so this branch cannot run;
          // it is here for the type rather than the reader
          if (!answer) return null;

          return answer.answer === 'item' ? (
            <MediaCard
              key={key}
              item={answer.item}
              lookup={lookup}
              next={nexts[index] ?? null}
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
              href={listAddress(state, { kind, page: page - 1 })}
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
              href={listAddress(state, { kind, page: page + 1 })}
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
 * One page of one of a Viewer's two lists — the Watchlist, or the Watched
 * list — shared by both routes, which differ only in the state they show. A
 * page shows one Kind of that list at a time, which `?kind=` names.
 * — `docs/adr/0015-the-lists-tabs-are-the-kind.md`
 *
 * The heading and the tabs are the shell, and the heading is where the state
 * is said: the tabs are the Kind, and the header's links are the way to the
 * other list. The tallies stream into the tabs and the cards into the grid,
 * each behind a boundary of its own, because the database answers in one round
 * trip and TMDB in twenty.
 *
 * Nothing moves when a card here is marked. A card pressed out of this list
 * shows its new state where it is, and the list catches up on the next
 * navigation; that keeps the undo one press away.
 * — `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
 */
const WatchRecordList = ({
  state,
  searchParams,
}: {
  state: WatchState;
  searchParams: Promise<SearchParams>;
}): JSX.Element => (
  <main className='flex-1 p-4'>
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 py-4'>
      {/* no Back here: the header and the tabs are the ways off a list,
          and the empty state's "Browse trending" would only repeat one */}
      <h1 className='font-black text-3xl leading-[1.05]'>
        {LISTS[state].label}
      </h1>
      <Suspense fallback={<Tabs state={state} />}>
        <ListTabs state={state} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<MediaGridSkeleton />}>
        <ListPage state={state} searchParams={searchParams} />
      </Suspense>
    </div>
  </main>
);

export { WatchRecordList };
