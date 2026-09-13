import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { type JSX, Suspense } from 'react';

import { LinkRows } from '@/components/media/link-rows';
import { SeasonSkeleton } from '@/components/media/media-skeleton';
import { BackButton } from '@/components/ui/back-button';
import {
  episodeAddress,
  isMediaId,
  isSeasonNumber,
  type SeasonDetails,
  seasonDetails,
} from '@/lib/media';

type RouteParams = { kind: string; id: string; season: string };

/**
 * Resolves to `null` for any address TMDB cannot answer, the way the Show's
 * own page does. Only a Show has seasons, so `movie` is a 404 before a
 * request is made, whatever id follows it.
 */
const findSeason = async (
  params: Promise<RouteParams>,
): Promise<SeasonDetails | null> => {
  const { kind, id, season } = await params;

  if (kind !== 'tv' || !isMediaId(id) || !isSeasonNumber(season)) return null;

  return seasonDetails(Number(id), Number(season));
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> => {
  const season = await findSeason(params);

  if (!season) return {};

  return {
    title: `${season.show.label}: ${season.label}`,
    description: season.overview || undefined,
  };
};

/** The season, once TMDB has answered; behind the page's boundary. */
const Found = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<JSX.Element> => {
  const season = await findSeason(params);

  if (!season) notFound();

  const show = `/tv/${season.show.id}`;

  return (
    <>
      <BackButton href={show} className='self-start'>
        Back
      </BackButton>
      <div className='flex flex-col gap-2'>
        <Link
          href={show}
          className='self-start font-extrabold text-sm underline-offset-4 hover:underline'
        >
          {season.show.label}
        </Link>
        <h1 className='break-words font-black text-3xl leading-[1.05]'>
          {season.label}
        </h1>
      </div>
      {season.overview ? (
        <p className='max-w-[62ch] text-base leading-relaxed'>
          {season.overview}
        </p>
      ) : null}
      {season.episodes.length > 0 ? (
        <LinkRows
          label='Episodes'
          rows={season.episodes.map((episode) => ({
            href: episodeAddress({
              showId: season.show.id,
              season: season.number,
              episode: episode.number,
            }),
            number: episode.number,
            label: episode.label,
            facts: episode.facts,
          }))}
        />
      ) : (
        // a season TMDB has announced and listed no Episodes for yet
        <p className='opacity-60'>
          TMDB lists no episodes for this season yet.
        </p>
      )}
    </>
  );
};

const SeasonPage = ({
  params,
}: {
  params: Promise<RouteParams>;
}): JSX.Element => (
  <main className='flex-1 p-4'>
    <div className='mx-auto flex w-full max-w-5xl flex-col gap-6 py-4'>
      <Suspense fallback={<SeasonSkeleton />}>
        <Found params={params} />
      </Suspense>
    </div>
  </main>
);

export default SeasonPage;
