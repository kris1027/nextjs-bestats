import type { JSX } from 'react';

import { MediaGrid } from '@/components/media/media-grid';
import { BackButton } from '@/components/ui/back-button';
import { MarkingControlSkeleton } from '@/components/watch/control-skeleton';
import { PAGE_SIZE } from '@/lib/watch';

/**
 * A card's shape while the Media behind it is being fetched: the poster's
 * aspect, the title bar's height, and the control's. The same height as the
 * card that replaces it, so nothing moves when it lands.
 */
const MediaCardSkeleton = (): JSX.Element => (
  <li className='flex flex-col'>
    <div className='aspect-2/3 animate-pulse bg-muted' />
    <div className='h-7 animate-pulse bg-muted/60' />
    <div className='px-2.5 pt-2.5'>
      <MarkingControlSkeleton />
    </div>
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
 * What a detail page shows while TMDB is asked for the Media. The same
 * frame as `MediaDetail` — the backdrop's height, the poster's overlap, the
 * text's clearance — with blocks where the picture and the words go, and
 * the real back button where it will be, since going back needs nothing
 * from TMDB.
 */
const MediaDetailSkeleton = (): JSX.Element => (
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
      className='relative -mt-[calc(var(--backdrop-h)/3)] grid gap-8 px-8 pb-8 sm:grid-cols-[208px_1fr] lg:grid-cols-[260px_1fr]'
    >
      <div className='w-42 sm:w-52 lg:w-65'>
        <div className='aspect-2/3 animate-pulse bg-muted' />
      </div>
      <div className='flex flex-col gap-4 sm:pt-[calc(var(--backdrop-h)/3+1rem)]'>
        {/* the heading's own type size, so the block is one line of it */}
        <div className='w-2/3 animate-pulse bg-muted text-3xl leading-[1.05] lg:text-[40px]'>
          &nbsp;
        </div>
        <div className='h-7 w-1/2 animate-pulse bg-muted' />
        <div className='max-w-xs'>
          <MarkingControlSkeleton />
        </div>
        <div className='my-2 h-0.5 bg-foreground/40' />
        <div className='flex max-w-[62ch] flex-col gap-2'>
          <div className='h-4 animate-pulse bg-muted' />
          <div className='h-4 animate-pulse bg-muted' />
          <div className='h-4 w-3/4 animate-pulse bg-muted' />
        </div>
      </div>
    </div>
  </main>
);

export { MediaGridSkeleton, MediaDetailSkeleton };
