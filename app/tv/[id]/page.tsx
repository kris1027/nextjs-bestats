import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { JSX } from 'react';

import { Star } from 'lucide-react';

import { MediaPlaceholder } from '@/components/media/media-placeholder';
import { BackButton } from '@/components/ui/back-button';
import { Tag } from '@/components/ui/tag';
import { backdropUrl, posterUrl, showDetails } from '@/lib/tmdb';
import { formatAirDate, formatCount } from '@/lib/utils';

const DetailedShowPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<JSX.Element> => {
  const { id } = await params;

  const showId = Number(id);

  if (!/^[1-9]\d{0,8}$/.test(id)) notFound();

  const show = await showDetails(showId);

  const airDate = formatAirDate(show.first_air_date);

  return (
    <main className='mx-auto w-full max-w-300 flex-1 [--backdrop-h:17.5rem] sm:[--backdrop-h:22rem] lg:[--backdrop-h:26.25rem]'>
      <div className='relative h-(--backdrop-h) w-full overflow-hidden'>
        {show.backdrop_path ? (
          <Image
            src={backdropUrl(show.backdrop_path)}
            fill
            // decorative: the page's accessible name comes from the <h1> below it
            alt=''
            className='object-cover object-top'
            sizes='(min-width: 1200px) 1200px, 100vw'
            priority
          />
        ) : (
          <MediaPlaceholder kind='backdrop' />
        )}
        <div className='pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-40% to-background' />
        <BackButton href='/' className='absolute top-6 left-6'>
          Back
        </BackButton>
      </div>
      <div className='relative -mt-[calc(var(--backdrop-h)/3)] grid gap-8 px-8 pb-8 sm:grid-cols-[208px_1fr] lg:grid-cols-[260px_1fr]'>
        <div className='w-42 shadow-lg sm:w-52 lg:w-65'>
          {show.poster_path ? (
            <Image
              src={posterUrl(show.poster_path)}
              width={780}
              height={1170}
              // decorative: the page's accessible name comes from the <h1> below it
              alt=''
              className='h-auto w-full'
              sizes='(min-width: 1024px) 260px, (min-width: 640px) 208px, 168px'
            />
          ) : (
            <MediaPlaceholder kind='poster' />
          )}
        </div>

        <div className='flex flex-col gap-4 sm:pt-[calc(var(--backdrop-h)/3+1rem)]'>
          <h1 className='font-black font-heading text-3xl leading-[1.05] lg:text-[40px]'>
            {show.name}
          </h1>

          <div className='flex flex-wrap items-center gap-6'>
            <div className='flex items-center gap-1.5'>
              <Star size={20} className='fill-current text-primary-accent' />
              <span className='font-extrabold font-heading text-lg'>
                {show.vote_average.toFixed(1)}
              </span>
              <span className='text-sm opacity-60'>
                (
                {formatCount(show.vote_count, {
                  one: 'vote',
                  other: 'votes',
                })}
                )
              </span>
            </div>
            {airDate ? <Tag>First aired: {airDate}</Tag> : null}
            <Tag>
              {formatCount(show.number_of_seasons, {
                one: 'season',
                other: 'seasons',
              })}
            </Tag>
            <Tag>
              {formatCount(show.number_of_episodes, {
                one: 'episode',
                other: 'episodes',
              })}
            </Tag>
          </div>

          <div className='my-2 h-0.5 bg-foreground/40' />

          {show.overview ? (
            <p className='max-w-[62ch] text-base leading-relaxed'>
              {show.overview}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
};

export default DetailedShowPage;
