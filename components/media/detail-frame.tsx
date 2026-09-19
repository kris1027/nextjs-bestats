import Image from 'next/image';
import type { JSX, ReactNode } from 'react';

import { Star } from 'lucide-react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { BackButton } from '@/components/ui/back-button';
import { Tag } from '@/components/ui/tag';
import { formatCount } from '@/lib/format';
import type { Rating } from '@/lib/media';

/**
 * What every detail page is drawn in: a wide picture across the top, the
 * poster overlapping its bottom third, and a column of words beside it —
 * `children`. A piece of Media's page and an Episode's are the same frame
 * around different words, so the measurements that keep the overlap and the
 * clearance in step live here once.
 */
const DetailFrame = ({
  backdropUrl,
  posterUrl,
  back,
  children,
}: {
  backdropUrl: string | null;
  posterUrl: string | null;
  /** Where Back goes when the Visitor did not arrive from inside the app. */
  back: string;
  children: ReactNode;
}): JSX.Element => (
  // --backdrop-h drives the backdrop height, the poster's overlap and the
  // text clearance below; changing it keeps all three in step
  <main className='mx-auto w-full max-w-300 flex-1 [--backdrop-h:17.5rem] sm:[--backdrop-h:22rem] lg:[--backdrop-h:26.25rem]'>
    <div className='relative h-(--backdrop-h) w-full overflow-hidden'>
      {backdropUrl ? (
        <Image
          src={backdropUrl}
          fill
          // decorative: the page's accessible name comes from the <h1> below it
          alt=''
          // top-anchored: wide viewports crop ~255px, and the gradient below
          // already hides the bottom, so send the whole crop there
          className='object-cover object-top'
          sizes='(min-width: 1200px) 1200px, 100vw'
          preload
        />
      ) : (
        <MediaPlaceholder artwork='backdrop' />
      )}
      {/* fades the bottom 60% of the backdrop into the page background */}
      <div className='pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-40% to-background' />
      <BackButton href={back} className='absolute top-6 left-6'>
        Back
      </BackButton>
    </div>
    {/* The poster overlaps the bottom third of the backdrop. `px-4` is what
        every other page's `main` is padded by, and this was the one place
        that said `px-8` at every width: 64px of a 390px screen, spent on
        margin, in the page a shared link lands on. */}
    <div className='relative -mt-[calc(var(--backdrop-h)/3)] grid gap-8 px-4 pb-8 sm:grid-cols-[208px_1fr] sm:px-8 lg:grid-cols-[260px_1fr]'>
      {/* the slot owns the poster's size, so both branches match; self-start
          because a grid item stretches to its row, and beside a Show's
          seasons the row is far taller than the poster */}
      <div className='w-42 self-start shadow-lg sm:w-52 lg:w-65'>
        {posterUrl ? (
          <Image
            src={posterUrl}
            width={780}
            height={1170}
            // decorative: the page's accessible name comes from the <h1> below it
            alt=''
            className='h-auto w-full'
            sizes='(min-width: 1024px) 260px, (min-width: 640px) 208px, 168px'
            // overlapping the backdrop puts it on the first screen at every
            // width, and where there is no backdrop it is the largest paint
            loading='eager'
          />
        ) : (
          <MediaPlaceholder artwork='poster' />
        )}
      </div>

      {/* clears the overlap so the text starts 1rem below the backdrop;
          min-w-0 because a grid item is otherwise as wide as its longest
          unbreakable run, and the heading's break-words never gets to act */}
      <div className='flex min-w-0 flex-col gap-4 sm:pt-[calc(var(--backdrop-h)/3+1rem)]'>
        {children}
      </div>
    </div>
  </main>
);

/**
 * TMDB's Rating and the votes behind it, or nothing: unvoted Media has no
 * Rating, since TMDB's 0 is a placeholder and the vote count is what tells
 * the two apart. An Episode is voted on the same way, so it draws the same.
 * — `docs/adr/0002-placeholder-facts-are-not-facts.md`
 */
const DetailRating = ({ rating, voteCount }: Rating): JSX.Element | null =>
  voteCount > 0 ? (
    <div className='flex items-center gap-1.5'>
      <Star size={20} className='fill-current text-primary-accent' />
      <span className='font-extrabold text-lg'>{rating.toFixed(1)}</span>
      <span className='text-sm opacity-60'>
        ({formatCount(voteCount, { one: 'vote', other: 'votes' })})
      </span>
    </div>
  ) : null;

/**
 * A detail page's name and, beneath it, its Rating and Facts. What a piece of
 * Media's page and an Episode's say first, in the same words, so it is drawn
 * once; each page puts what is its own around it.
 */
const DetailHeading = ({
  label,
  rating,
  voteCount,
  facts,
}: Rating & { label: string; facts: string[] }): JSX.Element => (
  <>
    <h1 className='break-words font-black text-3xl leading-[1.05] lg:text-[40px]'>
      {label}
    </h1>

    <div className='flex flex-wrap items-center gap-6'>
      <DetailRating rating={rating} voteCount={voteCount} />
      {/* facts arrive formatted and unique, so each is its own key */}
      {facts.map((fact) => (
        <Tag key={fact}>{fact}</Tag>
      ))}
    </div>
  </>
);

/**
 * The rule under a detail page's heading and the overview below it, which
 * TMDB may leave empty — then the rule stands alone.
 */
const DetailOverview = ({ overview }: { overview: string }): JSX.Element => (
  <>
    <div className='my-2 h-0.5 bg-foreground/40' />

    {overview ? (
      <p className='max-w-[62ch] text-base leading-relaxed'>{overview}</p>
    ) : null}
  </>
);

export { DetailFrame, DetailHeading, DetailOverview };
