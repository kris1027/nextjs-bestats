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
import { isKind, KIND_WORDS, KINDS, type Kind, mediaItems } from '@/lib/media';
import { signInAddress } from '@/lib/next-path';
import { firstValue, pageNumber, type SearchParams } from '@/lib/search-params';
import { cn, control } from '@/lib/utils';
import { viewerKey } from '@/lib/viewer-key';
import {
  LISTS,
  PAGE_SIZE,
  refOf,
  toLookup,
  type WatchState,
  type WatchTallies,
  watchKey,
} from '@/lib/watch';
import { watchRecordsPage, watchTallies } from '@/lib/watch-queries';

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
 * Which tab opens when the address does not name one: a Kind this Viewer has
 * records of, Shows when both have some and when neither does. The rule the
 * search page follows, for the same reason — a Watchlist that is all Movies
 * would otherwise open on an empty Shows tab and read as an empty Watchlist.
 * — `docs/adr/0004-search-is-two-searches.md`
 */
const defaultKind = (tallies: Record<Kind, number>): Kind =>
  tallies.tv === 0 && tallies.movie > 0 ? 'movie' : 'tv';

/** What both halves of a list read: who is asking, and which tab, at which page. */
type ListState = {
  viewerId: string;
  tallies: WatchTallies;
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
 * A Visitor is sent to sign in and back to this very address, `?kind=` and
 * `?page=` included. The redirect carries the Kind only if the address named
 * one: the default is read off counts this Visitor does not have.
 */
const listState = cache(
  async (
    state: WatchState,
    searchParams: Promise<SearchParams>,
  ): Promise<ListState> => {
    const params = await searchParams;
    const page = pageNumber(params.page);
    // `?kind=abc` is a typo rather than an address, so it falls through to the
    // default the way `/search` lets it — `lib/search-params.ts`
    const asked = firstValue(params.kind);
    const named = isKind(asked) ? asked : undefined;

    const currentViewer = await viewer();

    if (!currentViewer) {
      redirect(signInAddress(listAddress(state, { kind: named, page })));
    }

    const tallies = await watchTallies(currentViewer.id);

    return {
      viewerId: currentViewer.id,
      tallies,
      kind: named ?? defaultKind(tallies[state]),
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
  const { kind, tallies } = await listState(state, searchParams);

  return <Tabs state={state} selected={kind} tallies={tallies[state]} />;
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
 * With no `selected`, neither tab is marked. That is the fallback: which tab
 * is open is what the counts decide, so before they land nothing here can
 * honestly claim to be the open one, and guessing would move the mark under a
 * Viewer whose list is all Movies. It gains a mark; it never changes one.
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
 * One page of one tab: the records are one round trip, and the Media behind
 * them a TMDB request apiece, settled apart, which is the cost `PAGE_SIZE`
 * bounds and the wait this boundary holds the grid's shape for. A record whose
 * Media came back Gone or Unanswered still renders, as an `AbsentCard`.
 */
const ListPage = async ({
  state,
  searchParams,
}: {
  state: WatchState;
  searchParams: Promise<SearchParams>;
}): Promise<JSX.Element> => {
  const { viewerId, kind, page } = await listState(state, searchParams);

  const { records, total } = await watchRecordsPage(
    viewerId,
    state,
    kind,
    page,
  );

  // a page past the end is no address at all; page 1 of nothing is the empty
  // state below, since a tab with nothing on it still exists
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

  const refs = records.map(refOf);
  // in the refs' order, so an answer and its record share an index
  const answers = await mediaItems(refs);
  // the page's own records are its lookup: every card on it has a state
  const lookup = {
    states: toLookup(records),
    viewerKey: viewerKey({ id: viewerId }),
  };

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
            <MediaCard key={key} item={answer.item} lookup={lookup} />
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
