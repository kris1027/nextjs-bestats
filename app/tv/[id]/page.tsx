import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { JSX, ReactNode } from 'react';

import { Star } from 'lucide-react';

import { BackButton } from '@/components/ui/back-button';
import { backdropUrl, posterUrl, showDetails } from '@/lib/tmdb';
import { formatAirDate, formatCount } from '@/lib/utils';

const Tag = ({ children }: { children: ReactNode }): JSX.Element => (
  <span className='inline-flex items-center border border-primary-accent px-2.5 py-0.75 text-[11px] text-primary-accent tracking-wide'>
    {children}
  </span>
);

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
    // --backdrop-h drives the backdrop height, the poster's overlap and the
    // text clearance below; changing it keeps all three in step
    <main className='mx-auto w-full max-w-300 flex-1 [--backdrop-h:17.5rem] sm:[--backdrop-h:22rem] lg:[--backdrop-h:26.25rem]'>
      <div className='relative h-(--backdrop-h) w-full overflow-hidden'>
        {show.backdrop_path ? (
          <Image
            src={backdropUrl(show.backdrop_path)}
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
          <div className='flex h-full items-center justify-center bg-muted text-muted-foreground text-sm'>
            brak tła
          </div>
        )}
        {/* fades the bottom 60% of the backdrop into the page background */}
        <div className='pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-40% to-background' />
        <BackButton href='/' className='absolute top-6 left-6'>
          Powrót
        </BackButton>
      </div>
      {/* the poster overlaps the bottom third of the backdrop */}
      <div className='relative -mt-[calc(var(--backdrop-h)/3)] grid gap-8 px-8 pb-8 sm:grid-cols-[208px_1fr] lg:grid-cols-[260px_1fr]'>
        <div>
          {show.poster_path ? (
            <Image
              src={posterUrl(show.poster_path)}
              width={780}
              height={1170}
              // decorative: the page's accessible name comes from the <h1> below it
              alt=''
              className='h-auto w-42 shadow-lg sm:w-52 lg:w-65'
              sizes='(min-width: 1024px) 260px, (min-width: 640px) 208px, 168px'
            />
          ) : (
            <div className='flex w-42 aspect-2/3 items-center justify-center bg-muted text-muted-foreground text-sm shadow-lg sm:w-52 lg:w-65'>
              brak plakatu
            </div>
          )}
        </div>

        {/* clears the overlap so the text starts 1rem below the backdrop */}
        <div className='flex flex-col gap-4 sm:pt-[calc(var(--backdrop-h)/3_+_1rem)]'>
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
                  one: 'głos',
                  few: 'głosy',
                  many: 'głosów',
                })}
                )
              </span>
            </div>
            {airDate ? <Tag>Premiera: {airDate}</Tag> : null}
            <Tag>
              {formatCount(show.number_of_seasons, {
                one: 'sezon',
                few: 'sezony',
                many: 'sezonów',
              })}
            </Tag>
            <Tag>
              {formatCount(show.number_of_episodes, {
                one: 'odcinek',
                few: 'odcinki',
                many: 'odcinków',
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
