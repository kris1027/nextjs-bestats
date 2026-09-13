import type { JSX, ReactNode } from 'react';

import { MediaGrid } from '@/components/media/media-grid';
import { BackButton } from '@/components/ui/back-button';
import { MarkingControlSkeleton } from '@/components/watch/control-skeleton';
import { PAGE_SIZE } from '@/lib/watch';

/**
 * A card's shape while the Media behind it is being fetched: the poster's
 * aspect and the title bar's height, which is the whole of a card now that
 * marking left it. The same height as the card that replaces it, so nothing
 * moves when it lands.
 *
 * A list page's grid can hold an `AbsentCard`, which does still draw a
 * control, and this stands a control's height short for that one card. The
 * other way round — reserving the height on every grid for a card that
 * almost never appears — would move every card on Trending and on search.
 */
const MediaCardSkeleton = (): JSX.Element => (
  <li className='flex flex-col'>
    <div className='aspect-2/3 animate-pulse bg-muted' />
    <div className='h-7 animate-pulse bg-muted/60' />
  </li>
);

/**
 * What a grid shows while its cards are being fetched. Twenty, because that
 * is a page of Watch Records and a page of TMDB results alike, so the
 * fallback is the height of what replaces it. One "Loading" for a screen
 * reader rather than twenty blocks, and the blocks hidden from it.
 */
const MediaGridSkeleton = (): JSX.Element => (
  // <output> is a live region on its own, as the marking control's is
  <output aria-busy='true' className='block'>
    <span className='sr-only'>Loading</span>
    <div aria-hidden='true'>
      <MediaGrid>
        {Array.from({ length: PAGE_SIZE }, (_, index) => (
          // nothing distinguishes one block from another but its position
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
          <MediaCardSkeleton key={index} />
        ))}
      </MediaGrid>
    </div>
  </output>
);

/**
 * `DetailFrame` while TMDB is asked: the backdrop's height, the poster's
 * overlap and the text's clearance, with blocks where the pictures go and
 * `children` where the words do. The real back button stands where it will
 * be, since going back needs nothing from TMDB — though it goes to `/`, as
 * the fallback cannot read the address that would say where else.
 */
const DetailFrameSkeleton = ({
  children,
}: {
  children: ReactNode;
}): JSX.Element => (
  <main className='mx-auto w-full max-w-300 flex-1 [--backdrop-h:17.5rem] sm:[--backdrop-h:22rem] lg:[--backdrop-h:26.25rem]'>
    <output aria-busy='true' className='sr-only'>
      Loading
    </output>
    <div className='relative h-(--backdrop-h) w-full overflow-hidden'>
      <div className='h-full animate-pulse bg-muted' aria-hidden='true' />
      <div className='pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-40% to-background' />
      <BackButton href='/' className='absolute top-6 left-6'>
        Back
      </BackButton>
    </div>
    <div
      aria-hidden='true'
      className='relative -mt-[calc(var(--backdrop-h)/3)] grid gap-8 px-4 pb-8 sm:grid-cols-[208px_1fr] sm:px-8 lg:grid-cols-[260px_1fr]'
    >
      <div className='w-42 self-start sm:w-52 lg:w-65'>
        <div className='aspect-2/3 animate-pulse bg-muted' />
      </div>
      <div className='flex flex-col gap-4 sm:pt-[calc(var(--backdrop-h)/3+1rem)]'>
        {children}
      </div>
    </div>
  </main>
);

/**
 * A detail page's heading and the row of its Rating and Facts. The row wraps,
 * so a block of fixed height stood a line or two short on a phone: instead
 * it holds `DetailRating` and a `Tag` for each of `facts` in their own box
 * sizes, with the words kept invisible, and wraps where the real row does.
 * `facts` are typical of the page, since the real ones are what is awaited.
 */
const HeadingSkeleton = ({ facts }: { facts: string[] }): JSX.Element => (
  <>
    {/* the heading's own type size, so the block is one line of it */}
    <div className='w-2/3 animate-pulse bg-muted text-3xl leading-[1.05] lg:text-[40px]'>
      &nbsp;
    </div>
    <div className='flex flex-wrap items-center gap-6'>
      <div className='flex animate-pulse items-center gap-1.5 bg-muted'>
        <span className='invisible flex items-center gap-1.5'>
          <span className='size-5' />
          <span className='font-extrabold text-lg'>8.4</span>
          <span className='text-sm'>(1,234 votes)</span>
        </span>
      </div>
      {facts.map((fact) => (
        // `Tag`'s own box, border included, so the block is its size
        <span
          key={fact}
          className='inline-flex animate-pulse border border-transparent bg-muted px-2.5 py-0.75 text-[11px] tracking-wide'
        >
          <span className='invisible'>{fact}</span>
        </span>
      ))}
    </div>
  </>
);

/** A detail page's divider and the first lines of its overview. */
const OverviewSkeleton = (): JSX.Element => (
  <>
    <div className='my-2 h-0.5 bg-foreground/40' />
    <div className='flex max-w-[62ch] flex-col gap-2'>
      <div className='h-4 animate-pulse bg-muted' />
      <div className='h-4 animate-pulse bg-muted' />
      <div className='h-4 w-3/4 animate-pulse bg-muted' />
    </div>
  </>
);

/**
 * What a piece of Media's page shows while TMDB is asked for it, the marking
 * control's height included.
 *
 * A Show's page lists its seasons below the overview and a Movie's does not,
 * but this fallback is drawn before the address is read, so it cannot know
 * which Kind it stands for and holds no height for the list. The list lands
 * below everything else on the page, so nothing already drawn moves for it.
 *
 * The same blindness picks its Facts: a Movie's two. A Show's three wrap onto
 * a third line on the narrowest phones, so there a Show's page moves by one
 * row of Facts; a guess of three would move every Movie's page instead.
 */
const MediaDetailSkeleton = (): JSX.Element => (
  <DetailFrameSkeleton>
    <HeadingSkeleton facts={['Released: October 15, 1999', '2h 19m']} />
    <div className='max-w-xs'>
      <MarkingControlSkeleton />
    </div>
    <OverviewSkeleton />
  </DetailFrameSkeleton>
);

/**
 * What an Episode's page shows while TMDB is asked for it: the line naming
 * its Show and season above the heading, and no marking control, since an
 * Episode has none yet.
 */
const EpisodeDetailSkeleton = (): JSX.Element => (
  <DetailFrameSkeleton>
    {/* the line's own type size, so the block is one line of it */}
    <div className='w-1/2 animate-pulse bg-muted text-sm'>&nbsp;</div>
    <HeadingSkeleton facts={['Air date: February 17, 2022', '57m']} />
    <OverviewSkeleton />
  </DetailFrameSkeleton>
);

/**
 * `LinkRows` while TMDB is asked: the same padding, borders and type sizes,
 * with a block for each line, so a row stacks onto two lines on a phone and
 * sits on one from `sm:` exactly as the row that replaces it does.
 */
const LinkRowsSkeleton = ({ count }: { count: number }): JSX.Element => (
  <div className='flex flex-col border-foreground/20 border-t'>
    {Array.from({ length: count }, (_, index) => (
      // nothing distinguishes one block from another but its position
      // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity
      <div key={index} className='border-foreground/20 border-b'>
        <div className='flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4'>
          <div className='w-1/2 animate-pulse bg-muted/60'>&nbsp;</div>
          <div className='w-1/4 animate-pulse bg-muted/60 text-sm'>&nbsp;</div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * What a season's page shows while TMDB is asked for it: the back button, a
 * line for the Show, the heading, the overview's lines and a column of rows.
 * Nine rows, which is a season of television more often than any other
 * count, so the fallback is near the height of what replaces it.
 */
const SeasonSkeleton = (): JSX.Element => (
  <>
    <output aria-busy='true' className='sr-only'>
      Loading
    </output>
    <BackButton href='/' className='self-start'>
      Back
    </BackButton>
    <div aria-hidden='true' className='flex flex-col gap-2'>
      <div className='w-1/3 animate-pulse bg-muted text-sm'>&nbsp;</div>
      <div className='w-1/2 animate-pulse bg-muted text-3xl leading-[1.05]'>
        &nbsp;
      </div>
    </div>
    <div aria-hidden='true' className='flex max-w-[62ch] flex-col gap-2'>
      <div className='h-4 animate-pulse bg-muted' />
      <div className='h-4 w-3/4 animate-pulse bg-muted' />
    </div>
    <div aria-hidden='true'>
      <LinkRowsSkeleton count={9} />
    </div>
  </>
);

export {
  EpisodeDetailSkeleton,
  MediaDetailSkeleton,
  MediaGridSkeleton,
  SeasonSkeleton,
};
