import Image from 'next/image';
import type { JSX } from 'react';

import { Star } from 'lucide-react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { BackButton } from '@/components/ui/back-button';
import { Tag } from '@/components/ui/tag';
import { formatCount } from '@/lib/format';
import type { MediaDetails } from '@/lib/media';

const MediaDetail = ({ media }: { media: MediaDetails }): JSX.Element => {
  return (
    // --backdrop-h drives the backdrop height, the poster's overlap and the
    // text clearance below; changing it keeps all three in step
    <main className='mx-auto w-full max-w-300 flex-1 [--backdrop-h:17.5rem] sm:[--backdrop-h:22rem] lg:[--backdrop-h:26.25rem]'>
      <div className='relative h-(--backdrop-h) w-full overflow-hidden'>
        {media.backdropUrl ? (
          <Image
            src={media.backdropUrl}
            fill
            // decorative: the page's accessible name comes from the <h1> below it
            alt=''
            // top-anchored: wide viewports crop ~255px, and the gradient below
            // already hides the bottom, so send the whole crop there
            className='object-cover object-top'
            sizes='(min-width: 1200px) 1200px, 100vw'
            priority
          />
        ) : (
          <MediaPlaceholder artwork='backdrop' />
        )}
        {/* fades the bottom 60% of the backdrop into the page background */}
        <div className='pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-40% to-background' />
        <BackButton href='/' className='absolute top-6 left-6'>
          Back
        </BackButton>
      </div>
      {/* the poster overlaps the bottom third of the backdrop */}
      <div className='relative -mt-[calc(var(--backdrop-h)/3)] grid gap-8 px-8 pb-8 sm:grid-cols-[208px_1fr] lg:grid-cols-[260px_1fr]'>
        {/* the slot owns the poster's size, so both branches match */}
        <div className='w-42 shadow-lg sm:w-52 lg:w-65'>
          {media.posterUrl ? (
            <Image
              src={media.posterUrl}
              width={780}
              height={1170}
              // decorative: the page's accessible name comes from the <h1> below it
              alt=''
              className='h-auto w-full'
              sizes='(min-width: 1024px) 260px, (min-width: 640px) 208px, 168px'
            />
          ) : (
            <MediaPlaceholder artwork='poster' />
          )}
        </div>

        {/* clears the overlap so the text starts 1rem below the backdrop */}
        <div className='flex flex-col gap-4 sm:pt-[calc(var(--backdrop-h)/3+1rem)]'>
          <h1 className='font-black text-3xl leading-[1.05] lg:text-[40px]'>
            {media.label}
          </h1>

          <div className='flex flex-wrap items-center gap-6'>
            <div className='flex items-center gap-1.5'>
              <Star size={20} className='fill-current text-primary-accent' />
              <span className='font-extrabold text-lg'>
                {media.rating.toFixed(1)}
              </span>
              <span className='text-sm opacity-60'>
                (
                {formatCount(media.voteCount, {
                  one: 'vote',
                  other: 'votes',
                })}
                )
              </span>
            </div>
            {/* facts arrive formatted and unique, so each is its own key */}
            {media.facts.map((fact) => (
              <Tag key={fact}>{fact}</Tag>
            ))}
          </div>

          <div className='my-2 h-0.5 bg-foreground/40' />

          {media.overview ? (
            <p className='max-w-[62ch] text-base leading-relaxed'>
              {media.overview}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
};

export { MediaDetail };
