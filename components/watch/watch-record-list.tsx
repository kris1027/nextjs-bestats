import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { JSX } from 'react';

import { MediaCard } from '@/components/media/media-card';
import { MediaGrid } from '@/components/media/media-grid';
import { LinkTabs } from '@/components/navigation/link-tabs';
import { BackButton } from '@/components/ui/back-button';
import { AbsentCard } from '@/components/watch/absent-card';
import { viewer } from '@/lib/auth';
import { formatNumber } from '@/lib/format';
import { mediaItems } from '@/lib/media';
import { pageNumber } from '@/lib/search-params';
import {
  LISTS,
  PAGE_SIZE,
  stateOf,
  toLookup,
  WATCH_STATES,
  type WatchState,
} from '@/lib/watch';
import { watchRecordsPage, watchTallies } from '@/lib/watch-queries';

/** The address of one page of a list; page 1 is the list's own address. */
const pageAddress = (state: WatchState, page: number): string =>
  page > 1 ? `${LISTS[state].path}?page=${page}` : LISTS[state].path;

const EMPTY: Record<WatchState, string> = {
  planned:
    'Nothing planned yet. Mark a show or movie Planned and it will appear here.',
  watched:
    'Nothing watched yet. Mark a show or movie Watched and it will appear here.',
};

const link =
  'inline-flex items-center gap-2 border border-foreground/40 px-3.5 py-2 font-extrabold text-foreground text-sm leading-[1.2] transition-colors hover:bg-foreground/7 active:bg-foreground/14';

/**
 * One page of one of a Viewer's two lists — the Watchlist, or the Watched
 * list — shared by both routes, which differ only in the state they show.
 *
 * A Visitor is sent to sign in and back to this very address, `?page=`
 * included. The records and both tallies are one round trip each, issued
 * together; the Media behind the records is a TMDB request apiece, settled
 * apart, which is the cost `PAGE_SIZE` bounds. A record whose Media came
 * back Gone or Unanswered still renders, as an `AbsentCard`.
 *
 * Nothing moves after a mark here. A card pressed out of this list shows its
 * new state where it is, and the list catches up on the next navigation;
 * that keeps the undo one press away.
 * — `docs/adr/0006-a-watch-record-stores-no-copy-of-tmdb.md`
 */
const WatchRecordList = async ({
  state,
  page: pageParam,
}: {
  state: WatchState;
  page: string | string[] | undefined;
}): Promise<JSX.Element> => {
  const page = pageNumber(pageParam);
  const here = pageAddress(state, page);

  const currentViewer = await viewer();

  if (!currentViewer) redirect(`/sign-in?next=${encodeURIComponent(here)}`);

  const [{ records, total }, tallies] = await Promise.all([
    watchRecordsPage(currentViewer.id, state, page),
    watchTallies(currentViewer.id),
  ]);

  // a page past the end is no address at all; page 1 of nothing is the empty
  // state below, since a list with nothing on it still exists
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (page > pages) notFound();

  const refs = records.map((record) => ({
    kind: record.kind,
    id: record.tmdbId,
  }));
  // in the refs' order, so an answer and its record share an index
  const answers = await mediaItems(refs);
  // the page's own records are its lookup: every card on it has a state
  const lookup = toLookup(records);

  return (
    <main className='flex-1 p-4'>
      <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 py-4'>
        <BackButton href='/' className='self-start'>
          Back to trending
        </BackButton>
        <h1 className='font-black text-3xl leading-[1.05]'>
          {LISTS[state].label}
        </h1>
        <LinkTabs
          label='Watchlist or watched'
          tabs={WATCH_STATES.map((each) => ({
            href: LISTS[each].path,
            label: LISTS[each].label,
            selected: each === state,
            tally: tallies[each],
          }))}
        />
        {total === 0 ? (
          <>
            <p className='opacity-60'>{EMPTY[state]}</p>
            <Link href='/' className={`${link} self-start`}>
              Browse trending
            </Link>
          </>
        ) : (
          <>
            <MediaGrid>
              {refs.map((ref, index) => {
                const answer = answers[index];
                const key = `${ref.kind}/${ref.id}`;

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
                    state={stateOf(lookup, ref)}
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
                  <Link href={pageAddress(state, page - 1)} className={link}>
                    Previous
                  </Link>
                ) : (
                  <span />
                )}
                <p className='text-sm opacity-60'>
                  Page {formatNumber(page)} of {formatNumber(pages)}
                </p>
                {page < pages ? (
                  <Link href={pageAddress(state, page + 1)} className={link}>
                    Next
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
};

export { WatchRecordList };
