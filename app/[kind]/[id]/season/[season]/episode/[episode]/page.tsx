import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type JSX, Suspense } from 'react';

import { EpisodeDetail } from '@/components/media/episode-detail';
import { MediaDetailSkeleton } from '@/components/media/media-skeleton';
import {
  type EpisodeDetails,
  episodeDetails,
  isEpisodeNumber,
  isMediaId,
  isSeasonNumber,
} from '@/lib/media';

type RouteParams = {
  kind: string;
  id: string;
  season: string;
  episode: string;
};

/**
 * Resolves to `null` for any address TMDB cannot answer. The address is a
 * position, which is what finds an Episode today and all it is good for:
 * TMDB renumbers, so nothing should keep one.
 * — `docs/adr/0020-an-episode-record-is-keyed-on-its-tmdb-id.md`
 */
const findEpisode = async (
  params: Promise<RouteParams>,
): Promise<EpisodeDetails | null> => {
  const { kind, id, season, episode } = await params;

  if (
    kind !== 'tv' ||
    !isMediaId(id) ||
    !isSeasonNumber(season) ||
    !isEpisodeNumber(episode)
  ) {
    return null;
  }

  return episodeDetails({
    showId: Number(id),
    season: Number(season),
    episode: Number(episode),
  });
};

export const generateMetadata = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> => {
  const episode = await findEpisode(params);

  if (!episode) return {};

  return {
    title: `${episode.label} · ${episode.show.label}`,
    description: episode.overview || undefined,
  };
};

/** The Episode, once TMDB has answered; behind the page's boundary. */
const Found = async ({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<JSX.Element> => {
  const episode = await findEpisode(params);

  if (!episode) notFound();

  return <EpisodeDetail episode={episode} />;
};

const EpisodePage = ({
  params,
}: {
  params: Promise<RouteParams>;
}): JSX.Element => (
  <Suspense fallback={<MediaDetailSkeleton control={false} />}>
    <Found params={params} />
  </Suspense>
);

export default EpisodePage;
